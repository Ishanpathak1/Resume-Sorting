import numpy as np
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class CandidateRanker:
    def __init__(self):
        # Scoring weights
        self.weights = {
            "skills": 0.3,
            "experience": 0.25,
            "education": 0.2,
            "authenticity": 0.25  # Fraud penalty
        }
        
        # Skill category importance (updated for AI structure)
        self.skill_importance = {
            "programming_languages": 0.3,
            "frameworks_libraries": 0.25,
            "databases": 0.2,
            "cloud_platforms": 0.15,
            "tools_technologies": 0.1
        }
    
    def calculate_score(self, parsed_data: Dict, fraud_analysis: Dict) -> Dict:
        """Calculate comprehensive candidate score"""
        try:
            # Individual component scores
            skills_score = self._score_skills(parsed_data.get("skills", {}))
            experience_score = self._score_experience(parsed_data.get("experience", {}))
            education_score = self._score_education(parsed_data.get("education", {}))
            authenticity_score = self._score_authenticity(fraud_analysis)
            
            # Calculate weighted total
            total_score = (
                skills_score * self.weights["skills"] +
                experience_score * self.weights["experience"] +
                education_score * self.weights["education"] +
                authenticity_score * self.weights["authenticity"]
            )
            
            return {
                "total_score": round(total_score, 2),
                "component_scores": {
                    "skills": round(skills_score, 2),
                    "experience": round(experience_score, 2),
                    "education": round(education_score, 2),
                    "authenticity": round(authenticity_score, 2)
                },
                "percentile_rank": self._calculate_percentile(total_score),
                "recommendation": self._get_recommendation(total_score, fraud_analysis),
                "scoring_details": {
                    "skills_breakdown": self._get_skills_breakdown(parsed_data.get("skills", {})),
                    "experience_breakdown": self._get_experience_breakdown(parsed_data.get("experience", {})),
                    "education_breakdown": self._get_education_breakdown(parsed_data.get("education", {})),
                    "authenticity_breakdown": self._get_authenticity_breakdown(fraud_analysis)
                },
                "detailed_explanations": self._get_detailed_explanations(
                    skills_score, experience_score, education_score, authenticity_score,
                    parsed_data, fraud_analysis
                )
            }
            
        except Exception as e:
            logger.error(f"Error calculating candidate score: {str(e)}")
            return {
                "total_score": 0.0,
                "component_scores": {
                    "skills": 0.0,
                    "experience": 0.0,
                    "education": 0.0,
                    "authenticity": 0.0
                },
                "percentile_rank": 0,
                "recommendation": f"Unable to score candidate: {str(e)}",
                "scoring_details": {"error": str(e)},
                "detailed_explanations": {
                    "error": f"Scoring failed: {str(e)}",
                    "suggestions": ["Please re-upload the resume", "Ensure the resume is in a readable format"]
                }
            }
    
    def _score_skills(self, skills: Dict) -> float:
        """Score based on skills diversity and relevance (updated for AI structure)"""
        if not skills:
            return 0.0
        
        score = 0.0
        total_skills_count = 0
        
        # Score by category using AI structure
        for category, importance in self.skill_importance.items():
            category_skills = skills.get(category, [])
            if isinstance(category_skills, list):
                skill_count = len(category_skills)
                total_skills_count += skill_count
                # Score: 1 point per skill, max 5 skills per category for full points
                category_score = min(skill_count / 5, 1.0)
                score += category_score * importance
        
        # Add soft skills bonus
        soft_skills = skills.get("soft_skills", [])
        if isinstance(soft_skills, list) and len(soft_skills) > 0:
            score += min(len(soft_skills) / 10, 0.1)  # Max 10% bonus for soft skills
        
        # Bonus for skill diversity (total unique skills)
        diversity_bonus = min(total_skills_count / 20, 0.2)  # Max 20% bonus
        
        return min((score + diversity_bonus) * 100, 100)
    
    def _score_experience(self, experience: Dict) -> float:
        """Score based on years of experience and job titles"""
        if not experience:
            return 0.0
            
        # Handle both AI structure (total_years) and traditional structure (years_experience)
        years = experience.get("total_years", experience.get("years_experience", 0))
        
        # Ensure years is a valid number
        if years is None:
            years = 0
        
        # Handle positions from AI structure
        positions = experience.get("positions", [])
        titles = []
        
        if positions:
            titles = [pos.get("title", "") for pos in positions if isinstance(pos, dict)]
        else:
            # Fallback to traditional structure
            titles = experience.get("job_titles", [])
        
        # Years score (diminishing returns after 10 years)
        try:
            years_score = min(float(years) / 10, 1.0) * 70
        except (ValueError, TypeError):
            years_score = 0.0
        
        # Title relevance score
        senior_titles = ["senior", "lead", "principal", "architect", "manager", "director", "head", "chief"]
        title_score = 0
        
        for title in titles:
            if isinstance(title, str):
                title_lower = title.lower()
                if any(senior in title_lower for senior in senior_titles):
                    title_score += 10
                else:
                    title_score += 5
        
        title_score = min(title_score, 30)
        
        return min(years_score + title_score, 100)
    
    def _score_education(self, education: Dict) -> float:
        """Score based on education level and achievements (fixed for AI structure)"""
        if not education:
            return 20  # Default score for missing education
            
        degrees = education.get("degrees", [])
        
        degree_score = 0
        education_levels = {
            "phd": 40, "doctorate": 40, "doctoral": 40,
            "master": 30, "masters": 30, "mba": 35, "ms": 30, "ma": 30,
            "bachelor": 20, "bachelors": 20, "bs": 20, "ba": 20, "bsc": 20,
            "associate": 10, "associates": 10,
            "certificate": 5, "certification": 5, "diploma": 8
        }
        
        # Handle degrees list
        for degree_info in degrees:
            if isinstance(degree_info, dict):
                # AI structure: degree_info is a dict with 'degree' field
                degree_name = degree_info.get("degree", "").lower()
                gpa = degree_info.get("gpa")
            elif isinstance(degree_info, str):
                # Traditional structure: degree_info is a string
                degree_name = degree_info.lower()
                gpa = None
            else:
                continue
                
            # Find highest matching degree level
            for level, points in education_levels.items():
                if level in degree_name:
                    degree_score = max(degree_score, points)
                    break
            
            # GPA bonus (if provided and reasonable)
            if gpa and isinstance(gpa, (int, float)):
                if 0 < gpa <= 4.0:
                    degree_score += (gpa - 2.0) / 2.0 * 10  # Scale 2.0-4.0 to 0-10 points
                elif 4.0 < gpa <= 10.0:  # Some schools use 10-point scale
                    degree_score += (gpa - 5.0) / 5.0 * 10
        
        # If no degrees found, check for any education mention
        if degree_score == 0 and degrees:
            degree_score = 15  # Some education mentioned
        
        return min(degree_score, 100)
    
    def _score_authenticity(self, fraud_analysis: Dict) -> float:
        """Score authenticity (penalize fraud)"""
        if not fraud_analysis:
            return 75  # Neutral score if no analysis
        
        risk_score = fraud_analysis.get("overall_risk_score", 0)
        risk_level = fraud_analysis.get("risk_level", "low")
        
        # Convert risk to authenticity score
        if risk_level == "low":
            return max(100 - (risk_score * 100 * 0.2), 60)
        elif risk_level == "medium":
            return max(60 - (risk_score * 100 * 0.3), 30)
        else:  # high risk
            return max(20 - (risk_score * 100 * 0.2), 0)
    
    def _calculate_percentile(self, score: float) -> int:
        """Estimate percentile rank based on score"""
        # Simple mapping - in production, use historical data
        if score >= 80:
            return 95
        elif score >= 70:
            return 80
        elif score >= 60:
            return 65
        elif score >= 50:
            return 50
        elif score >= 40:
            return 35
        else:
            return 20
    
    def _get_recommendation(self, score: float, fraud_analysis: Dict) -> str:
        """Provide hiring recommendation with detailed reasoning"""
        risk_level = fraud_analysis.get("risk_level", "low") if fraud_analysis else "low"
        
        if risk_level == "high":
            return "Not Recommended - High fraud risk detected"
        elif score >= 75:
            return "Highly Recommended - Strong candidate with excellent qualifications"
        elif score >= 60:
            return "Recommended - Good candidate with solid qualifications"
        elif score >= 45:
            return "Consider - Average candidate, may need additional evaluation"
        else:
            return "Not Recommended - Below minimum requirements"
    
    # Helper methods for detailed breakdowns
    def _get_skills_breakdown(self, skills: Dict) -> Dict:
        """Get detailed skills scoring breakdown"""
        breakdown = {}
        total_skills = 0
        
        for category, importance in self.skill_importance.items():
            category_skills = skills.get(category, [])
            if isinstance(category_skills, list):
                count = len(category_skills)
                total_skills += count
                breakdown[category] = {
                    "count": count,
                    "skills": category_skills,
                    "importance": importance,
                    "score": min(count / 5, 1.0) * importance * 100
                }
        
        soft_skills = skills.get("soft_skills", [])
        if isinstance(soft_skills, list):
            breakdown["soft_skills"] = {
                "count": len(soft_skills),
                "skills": soft_skills,
                "bonus": min(len(soft_skills) / 10, 0.1) * 100
            }
        
        breakdown["total_skills"] = total_skills
        breakdown["diversity_bonus"] = min(total_skills / 20, 0.2) * 100
        
        return breakdown
    
    def _get_experience_breakdown(self, experience: Dict) -> Dict:
        """Get detailed experience scoring breakdown"""
        years = experience.get("total_years", experience.get("years_experience", 0))
        
        # Ensure years is a valid number
        if years is None:
            years = 0
            
        positions = experience.get("positions", [])
        
        try:
            years_score = min(float(years) / 10, 1.0) * 70
        except (ValueError, TypeError):
            years_score = 0.0
        
        return {
            "years": years,
            "years_score": years_score,
            "positions_count": len(positions),
            "positions": [pos.get("title", "") for pos in positions if isinstance(pos, dict)],
            "seniority_bonus": "Calculated based on title analysis"
        }
    
    def _get_education_breakdown(self, education: Dict) -> Dict:
        """Get detailed education scoring breakdown"""
        degrees = education.get("degrees", [])
        
        return {
            "degrees_count": len(degrees),
            "degrees": [deg.get("degree", deg) if isinstance(deg, dict) else deg for deg in degrees],
            "highest_level": "Calculated based on degree analysis"
        }
    
    def _get_authenticity_breakdown(self, fraud_analysis: Dict) -> Dict:
        """Get detailed authenticity scoring breakdown"""
        if not fraud_analysis:
            return {"status": "No fraud analysis available"}
        
        return {
            "risk_score": fraud_analysis.get("overall_risk_score", 0),
            "risk_level": fraud_analysis.get("risk_level", "unknown"),
            "detected_issues": fraud_analysis.get("detected_issues", []),
            "authenticity_score": f"Calculated based on {fraud_analysis.get('risk_level', 'unknown')} risk level"
        }
    
    def _get_detailed_explanations(self, skills_score: float, experience_score: float, 
                                 education_score: float, authenticity_score: float,
                                 parsed_data: Dict, fraud_analysis: Dict) -> Dict:
        """Generate detailed explanations for why scores are low and how to improve"""
        explanations = {
            "skills": self._explain_skills_score(skills_score, parsed_data.get("skills", {})),
            "experience": self._explain_experience_score(experience_score, parsed_data.get("experience", {})),
            "education": self._explain_education_score(education_score, parsed_data.get("education", {})),
            "authenticity": self._explain_authenticity_score(authenticity_score, fraud_analysis),
            "overall_recommendations": []
        }
        
        # Overall recommendations based on lowest scores
        if skills_score < 30:
            explanations["overall_recommendations"].append("Focus on adding more relevant technical skills and certifications")
        if experience_score < 30:
            explanations["overall_recommendations"].append("Highlight more years of experience and senior-level positions")
        if education_score < 30:
            explanations["overall_recommendations"].append("Include formal education or professional certifications")
        if authenticity_score < 60:
            explanations["overall_recommendations"].append("Provide more specific details and verifiable information")
            
        return explanations
    
    def _explain_skills_score(self, score: float, skills: Dict) -> Dict:
        """Explain skills score and provide improvement suggestions"""
        total_skills = sum(len(skills.get(cat, [])) for cat in self.skill_importance.keys())
        
        explanation = {
            "score": score,
            "reason": "",
            "missing_categories": [],
            "suggestions": []
        }
        
        if score < 20:
            explanation["reason"] = "Very few or no relevant technical skills found"
            explanation["suggestions"] = [
                "Add programming languages (Python, Java, JavaScript, etc.)",
                "Include frameworks and libraries you've used",
                "List database technologies you're familiar with",
                "Mention cloud platforms and tools"
            ]
        elif score < 40:
            explanation["reason"] = "Limited technical skills diversity"
            explanation["suggestions"] = [
                "Expand your skill set across different categories",
                "Add more programming languages",
                "Include more frameworks and tools"
            ]
        elif score < 60:
            explanation["reason"] = "Good skill foundation but lacks depth or breadth"
            explanation["suggestions"] = [
                "Add advanced or specialized skills",
                "Include soft skills and leadership abilities",
                "Mention certifications and recent technologies"
            ]
        else:
            explanation["reason"] = "Strong technical skill set"
            explanation["suggestions"] = ["Continue learning emerging technologies"]
        
        # Check missing categories
        for category in self.skill_importance.keys():
            if not skills.get(category):
                explanation["missing_categories"].append(category.replace('_', ' ').title())
        
        return explanation
    
    def _explain_experience_score(self, score: float, experience: Dict) -> Dict:
        """Explain experience score and provide improvement suggestions"""
        years = experience.get("total_years", experience.get("years_experience", 0)) or 0
        positions = experience.get("positions", [])
        
        explanation = {
            "score": score,
            "years_found": years,
            "positions_count": len(positions),
            "reason": "",
            "suggestions": []
        }
        
        if years == 0:
            explanation["reason"] = "No work experience detected"
            explanation["suggestions"] = [
                "Add your work history with specific dates",
                "Include internships, freelance work, or projects",
                "Mention job titles and company names",
                "Describe your responsibilities and achievements"
            ]
        elif years < 2:
            explanation["reason"] = "Limited work experience"
            explanation["suggestions"] = [
                "Highlight any relevant projects or internships",
                "Include volunteer work or leadership roles",
                "Emphasize skills gained from academic projects"
            ]
        elif years < 5:
            explanation["reason"] = "Moderate experience but may lack seniority"
            explanation["suggestions"] = [
                "Highlight progressive responsibility increases",
                "Mention any leadership or mentoring roles",
                "Include major projects or achievements"
            ]
        elif score < 50:
            explanation["reason"] = "Good experience but lacking senior-level positions"
            explanation["suggestions"] = [
                "Highlight leadership roles and responsibilities",
                "Mention team management or project leadership",
                "Include strategic or high-impact contributions"
            ]
        else:
            explanation["reason"] = "Strong professional experience"
            explanation["suggestions"] = ["Continue building expertise and leadership skills"]
        
        return explanation
    
    def _explain_education_score(self, score: float, education: Dict) -> Dict:
        """Explain education score and provide improvement suggestions"""
        degrees = education.get("degrees", [])
        
        explanation = {
            "score": score,
            "degrees_found": len(degrees),
            "reason": "",
            "suggestions": []
        }
        
        if not degrees:
            explanation["reason"] = "No formal education information found"
            explanation["suggestions"] = [
                "Add your highest degree (Bachelor's, Master's, PhD)",
                "Include relevant certifications",
                "Mention professional training programs",
                "Add online courses from reputable platforms"
            ]
        elif score < 25:
            explanation["reason"] = "Basic education level detected"
            explanation["suggestions"] = [
                "Consider pursuing higher education",
                "Add professional certifications",
                "Include specialized training programs"
            ]
        elif score < 40:
            explanation["reason"] = "Good educational foundation"
            explanation["suggestions"] = [
                "Add relevant certifications",
                "Include GPA if above 3.5",
                "Mention honors or achievements"
            ]
        else:
            explanation["reason"] = "Strong educational background"
            explanation["suggestions"] = ["Continue with professional development and certifications"]
        
        return explanation
    
    def _explain_authenticity_score(self, score: float, fraud_analysis: Dict) -> Dict:
        """Explain authenticity score and provide improvement suggestions"""
        explanation = {
            "score": score,
            "reason": "",
            "suggestions": []
        }
        
        if not fraud_analysis:
            explanation["reason"] = "No fraud analysis available"
            explanation["suggestions"] = ["Ensure resume contains verifiable information"]
            return explanation
        
        risk_level = fraud_analysis.get("risk_level", "unknown")
        detected_issues = fraud_analysis.get("detected_issues", [])
        
        if risk_level == "high":
            explanation["reason"] = "High fraud risk detected with multiple suspicious elements"
            explanation["suggestions"] = [
                "Provide more specific dates and details",
                "Include verifiable company information",
                "Add contact information for references",
                "Ensure all information is accurate and truthful"
            ]
        elif risk_level == "medium":
            explanation["reason"] = "Some inconsistencies or vague information detected"
            explanation["suggestions"] = [
                "Add more specific details about your experience",
                "Include exact dates and company information",
                "Provide concrete examples of achievements"
            ]
        elif score < 80:
            explanation["reason"] = "Generally authentic but could be more detailed"
            explanation["suggestions"] = [
                "Add more specific examples and metrics",
                "Include quantifiable achievements",
                "Provide more context for your experience"
            ]
        else:
            explanation["reason"] = "High authenticity with detailed, verifiable information"
            explanation["suggestions"] = ["Maintain current level of detail and accuracy"]
        
        if detected_issues:
            explanation["detected_issues"] = detected_issues
        
        return explanation 