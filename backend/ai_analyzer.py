import openai
import json
import re
from typing import Dict, List, Optional
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class AIAnalyzer:
    def __init__(self):
        self.client = openai.OpenAI(
            api_key=os.getenv('OPENAI_KEY')
        )
        # Cache for consolidated analysis to avoid repeated calls
        self._analysis_cache = {}
        # NEW: Cache for query intent analysis to avoid repeated AI calls
        self._intent_cache = {}
        # NEW: Cache for search responses to avoid repeated AI calls
        self._response_cache = {}
        
    # NEW: Helper methods for token optimization
    def _is_simple_search_query(self, user_message: str) -> bool:
        """Detect if this is a simple search that doesn't need AI analysis"""
        simple_patterns = [
            'find', 'search', 'get', 'show me', 'list', 'display',
            'looking for', 'need', 'want', 'hire'
        ]
        
        tech_patterns = [
            'developer', 'engineer', 'programmer', 'analyst', 'designer',
            'python', 'java', 'javascript', 'react', 'angular', 'vue',
            'frontend', 'backend', 'fullstack', 'full stack', 'full-stack'
        ]
        
        message_lower = user_message.lower()
        
        # If it contains simple search words AND tech terms, it's a simple search
        has_simple_pattern = any(pattern in message_lower for pattern in simple_patterns)
        has_tech_pattern = any(pattern in message_lower for pattern in tech_patterns)
        
        # Also check if it's a straightforward request (short and direct)
        is_short_direct = len(user_message.split()) <= 8
        
        return has_simple_pattern and (has_tech_pattern or is_short_direct)
    
    def _rule_based_intent_detection(self, user_message: str) -> Dict:
        """Fast rule-based intent detection for simple queries - no AI needed"""
        message_lower = user_message.lower()
        
        # Detect comparison queries
        if any(word in message_lower for word in ['compare', 'comparison', 'vs', 'versus', 'best', 'top']):
            return {
                "query_type": "comparison",
                "intent": "Compare candidates based on query",
                "entities": {},
                "action_required": "compare",
                "confidence": 0.9
            }
        
        # Detect analysis queries
        if any(word in message_lower for word in ['analyze', 'analysis', 'insights', 'trends', 'market']):
            return {
                "query_type": "analysis", 
                "intent": "Analyze market or candidate data",
                "entities": {},
                "action_required": "analyze",
                "confidence": 0.9
            }
        
        # Default to search for most queries
        return {
            "query_type": "search",
            "intent": f"Find candidates matching: {user_message}",
            "entities": {},
            "action_required": "search", 
            "confidence": 0.8
        }
    
    def _should_skip_market_analysis(self, user_message: str) -> bool:
        """Determine if we can skip expensive market analysis"""
        # Only do market analysis if explicitly requested
        analysis_keywords = ['analysis', 'analyze', 'market', 'trends', 'insights', 'statistics']
        return not any(keyword in user_message.lower() for keyword in analysis_keywords)
    
    def _create_minimal_candidate_summary(self, candidate: Dict) -> Dict:
        """Create minimal candidate summary for AI calls to reduce tokens"""
        try:
            parsed_data = candidate.get("parsed_data", {})
            personal_info = parsed_data.get("personal_info", {})
            
            # Get only essential data
            name = personal_info.get("full_name", "Unknown")
            
            # Get top 3 skills only
            skills = parsed_data.get("skills", {})
            prog_langs = skills.get("programming_languages", [])[:3]  # Limit to top 3
            frameworks = skills.get("frameworks_libraries", [])[:2]   # Limit to top 2
            
            # Basic experience info only
            experience = parsed_data.get("experience", {})
            years = experience.get("total_years", 0)
            
            return {
                "id": candidate.get("id"),
                "name": name,
                "top_skills": prog_langs + frameworks,  # Max 5 skills
                "experience_years": years,
                "score": candidate.get("ranking_score", {}).get("total_score", 0),
                "skill_relevance": candidate.get("skill_relevance_score", 0)
            }
        except Exception as e:
            logger.error(f"Error creating minimal summary: {str(e)}")
            return {
                "id": candidate.get("id", "unknown"),
                "name": "Unknown",
                "top_skills": [],
                "experience_years": 0,
                "score": 0,
                "skill_relevance": 0
            }
    
    def analyze_resume_comprehensive(self, text: str, traditional_data: Dict = None) -> Dict:
        """
        PHASE 1 & 2 OPTIMIZATION: Consolidated analysis to reduce API calls and costs
        Combines: data extraction + fraud detection + insights + interview questions
        Uses GPT-3.5-turbo instead of GPT-4 for 90% cost reduction
        """
        try:
            # Create cache key to avoid repeated analysis
            cache_key = hash(text[:500])  # Use first 500 chars as cache key
            if cache_key in self._analysis_cache:
                logger.info("Using cached comprehensive analysis")
                return self._analysis_cache[cache_key]
            
            # Create the JSON template separately to avoid f-string conflicts
            json_template = """{
                "personal_info": {"full_name": "", "first_name": "", "last_name": ""},
                "contact_info": {"email": "", "phone": "", "linkedin": "", "location": ""},
                "professional_summary": "",
                "skills": {
                    "programming_languages": [],
                    "frameworks_libraries": [],
                    "databases": [],
                    "cloud_platforms": [],
                    "tools_technologies": [],
                    "soft_skills": []
                },
                "experience": {
                    "total_years": 0,
                    "positions": [{"title": "", "company": "", "duration": "", "responsibilities": [], "technologies_used": []}]
                },
                "education": {
                    "degrees": [{"degree": "", "field": "", "institution": "", "graduation_year": "", "gpa": null}]
                },
                "certifications": [],
                "projects": [{"name": "", "description": "", "technologies": []}],
                "languages": [],
                "achievements": [],
                "fraud_analysis": {
                    "authenticity_score": 85,
                    "red_flags_count": 0,
                    "fraud_indicators": [
                        {"type": "keyword_stuffing", "severity": "medium", "description": ""},
                        {"type": "white_font_manipulation", "severity": "high", "description": ""},
                        {"type": "unrealistic_claims", "severity": "low", "description": ""}
                    ],
                    "ats_gaming_detected": false,
                    "overall_assessment": "",
                    "recommendation": "hire"
                },
                "insights": {
                    "strengths": [],
                    "areas_for_improvement": [],
                    "market_positioning": "",
                    "salary_estimate": "",
                    "cultural_fit_indicators": [],
                    "overall_score": 75
                },
                "interview_questions": []
            }"""
            
            prompt = f"""
            Analyze this resume and provide ALL of the following in ONE response:
            1. STRUCTURED DATA EXTRACTION
            2. FRAUD DETECTION ANALYSIS  
            3. CANDIDATE INSIGHTS
            4. INTERVIEW QUESTIONS (max 15 questions)
            
            IMPORTANT FRAUD DETECTION FOCUS:
            - Look for ATS gaming techniques like white font manipulation, keyword stuffing, hidden text
            - Check for unrealistic skill claims vs experience level
            - Identify suspicious formatting patterns, excessive repetition
            - Flag invisible characters, tiny fonts, or text positioning anomalies
            - Assess overall authenticity and coherence of the resume
            
            Return ONLY valid JSON with this EXACT structure:
            {json_template}
            
            Resume text:
            {text[:3000]}
            
            Be thorough in fraud detection. Look for patterns that indicate ATS manipulation or resume fraud. 
            If you detect potential fraud, lower the authenticity_score significantly and set appropriate red_flags_count.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # PHASE 2: Switched from GPT-4 (90% cost reduction)
                messages=[
                    {"role": "system", "content": "You are an expert HR analyst. Provide comprehensive but concise analysis in valid JSON format only. Ensure all strings are properly escaped and JSON is well-formed."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1800  # Increased for enhanced fraud detection
            )
            
            result = response.choices[0].message.content
            
            # Enhanced JSON cleaning and parsing
            cleaned_result = self._clean_and_parse_json(result)
            if cleaned_result is None:
                logger.warning("JSON parsing failed, using fallback analysis")
                return self._fallback_analysis(text, traditional_data)
            
            parsed_data = cleaned_result
            
            # Split the response into separate components for backward compatibility
            fraud_analysis = parsed_data.pop("fraud_analysis", {})
            insights = parsed_data.pop("insights", {})
            interview_questions = parsed_data.pop("interview_questions", [])
            
            # Add metadata
            parsed_data["ai_confidence"] = self._calculate_confidence(parsed_data)
            parsed_data["extraction_method"] = "openai_gpt3.5_consolidated"
            
            result_dict = {
                "parsed_data": parsed_data,
                "fraud_analysis": self._format_fraud_analysis(fraud_analysis),
                "insights": insights,
                "interview_questions": interview_questions
            }
            
            # Cache the result
            self._analysis_cache[cache_key] = result_dict
            logger.info("Comprehensive analysis completed and cached")
            
            return result_dict
            
        except Exception as e:
            logger.error(f"Error in comprehensive AI analysis: {str(e)}")
            return self._fallback_analysis(text, traditional_data)

    def _clean_and_parse_json(self, raw_response: str) -> Optional[Dict]:
        """Enhanced JSON cleaning and parsing with multiple fallback strategies"""
        try:
            # Step 1: Basic cleaning
            result = raw_response.strip()
            
            # Remove markdown code blocks
            if result.startswith('```json'):
                result = result[7:]
            elif result.startswith('```'):
                result = result[3:]
            if result.endswith('```'):
                result = result[:-3]
            
            result = result.strip()
            
            # Step 2: Try direct parsing
            try:
                return json.loads(result)
            except json.JSONDecodeError as e:
                logger.warning(f"Direct JSON parsing failed: {e}")
            
            # Step 3: Fix common JSON issues
            # Fix unterminated strings by finding incomplete quotes
            result = self._fix_unterminated_strings(result)
            
            # Fix trailing commas
            result = re.sub(r',(\s*[}\]])', r'\1', result)
            
            # Try parsing again
            try:
                return json.loads(result)
            except json.JSONDecodeError as e:
                logger.warning(f"Cleaned JSON parsing failed: {e}")
            
            # Step 4: Extract JSON from response if it's embedded
            json_match = re.search(r'\{.*\}', result, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            # Step 5: Try to fix truncated JSON
            if not result.endswith('}'):
                # Find the last complete object
                brace_count = 0
                last_valid_pos = -1
                for i, char in enumerate(result):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            last_valid_pos = i
                
                if last_valid_pos > 0:
                    truncated = result[:last_valid_pos + 1]
                    try:
                        return json.loads(truncated)
                    except json.JSONDecodeError:
                        pass
            
            logger.error("All JSON parsing strategies failed")
            return None
            
        except Exception as e:
            logger.error(f"Error in JSON cleaning: {str(e)}")
            return None

    def _fix_unterminated_strings(self, json_str: str) -> str:
        """Fix common unterminated string issues in JSON"""
        try:
            # Find and fix unterminated strings
            lines = json_str.split('\n')
            fixed_lines = []
            
            for line in lines:
                # Check if line has an unterminated string (odd number of quotes after colon)
                if ':' in line and '"' in line:
                    parts = line.split(':', 1)
                    if len(parts) == 2:
                        key_part, value_part = parts
                        # Count quotes in value part
                        quote_count = value_part.count('"')
                        # If odd number of quotes and doesn't end with quote, add closing quote
                        if quote_count % 2 == 1 and not value_part.strip().endswith('"') and not value_part.strip().endswith('",'):
                            # Find the position to add closing quote
                            if ',' in value_part:
                                value_part = value_part.replace(',', '",', 1)
                            else:
                                value_part = value_part.strip() + '"'
                            line = key_part + ':' + value_part
                
                fixed_lines.append(line)
            
            return '\n'.join(fixed_lines)
            
        except Exception as e:
            logger.warning(f"Error fixing unterminated strings: {e}")
            return json_str

    def _format_fraud_analysis(self, fraud_data: Dict) -> Dict:
        """Convert AI fraud analysis to expected format"""
        try:
            authenticity_score = fraud_data.get("authenticity_score", 85)
            return {
                "overall_risk_score": (100 - authenticity_score) / 100,
                "risk_level": self._determine_risk_level(authenticity_score),
                "detected_issues": [indicator.get("description", "") for indicator in fraud_data.get("fraud_indicators", [])],
                "detailed_analysis": {
                    "ai_fraud_detection": fraud_data,
                    "authenticity_score": authenticity_score,
                    "red_flags": fraud_data.get("red_flags_count", 0),
                    "recommendation": fraud_data.get("recommendation", "investigate")
                }
            }
        except Exception as e:
            logger.error(f"Error formatting fraud analysis: {str(e)}")
            return {
                "overall_risk_score": 0.3,
                "risk_level": "low",
                "detected_issues": [],
                "detailed_analysis": {"error": str(e)}
            }

    # PHASE 1: Updated legacy methods to use consolidated analysis
    def analyze_resume_content(self, text: str, traditional_data: Dict = None) -> Dict:
        """OPTIMIZED: Now uses consolidated analysis - 75% fewer API calls"""
        comprehensive = self.analyze_resume_comprehensive(text, traditional_data)
        return comprehensive["parsed_data"]
    
    def detect_fraud_with_ai(self, text: str, parsed_data: Dict) -> Dict:
        """OPTIMIZED: Now uses consolidated analysis - no additional API call"""
        # Try to get from consolidated analysis cache first
        cache_key = hash(text[:500])
        if cache_key in self._analysis_cache:
            return self._analysis_cache[cache_key]["fraud_analysis"]
        
        # Fallback to simple analysis if no cache
        return {
            "overall_risk_score": 0.3,
            "risk_level": "low",
            "detected_issues": [],
            "detailed_analysis": {"note": "Use analyze_resume_comprehensive for full analysis"}
        }
    
    def generate_candidate_insights(self, parsed_data: Dict, fraud_analysis: Dict) -> Dict:
        """OPTIMIZED: Now uses consolidated analysis - no additional API call"""
        # Try to get from consolidated analysis cache first
        if hasattr(self, '_last_comprehensive_result'):
            return self._last_comprehensive_result.get("insights", {})
        
        return {
            "strengths": ["Professional background"],
            "areas_for_improvement": ["Use analyze_resume_comprehensive for detailed insights"],
            "market_positioning": "Standard candidate",
            "salary_estimate": "Market rate",
            "cultural_fit_indicators": [],
            "overall_score": 70
        }
    
    def suggest_interview_questions(self, parsed_data: Dict) -> List[str]:
        """OPTIMIZED: Now uses consolidated analysis - no additional API call"""
        # Try to get from consolidated analysis cache first
        if hasattr(self, '_last_comprehensive_result'):
            return self._last_comprehensive_result.get("interview_questions", [])
        
        return [
            "Tell me about your most relevant experience for this role.",
            "What technical challenges have you solved recently?",
            "How do you approach learning new technologies?"
        ]
    
    def _calculate_confidence(self, parsed_data: Dict) -> float:
        """Calculate confidence score based on extracted data completeness"""
        try:
            total_fields = 0
            filled_fields = 0
            
            # Check personal info
            personal_info = parsed_data.get("personal_info", {})
            for field in ["full_name", "first_name", "last_name"]:
                total_fields += 1
                if personal_info.get(field):
                    filled_fields += 1
            
            # Check contact info
            contact_info = parsed_data.get("contact_info", {})
            for field in ["email", "phone"]:
                total_fields += 1
                if contact_info.get(field):
                    filled_fields += 1
            
            # Check experience
            experience = parsed_data.get("experience", {})
            total_fields += 1
            if experience.get("positions") and len(experience["positions"]) > 0:
                filled_fields += 1
            
            # Check education
            education = parsed_data.get("education", {})
            total_fields += 1
            if education.get("degrees") and len(education["degrees"]) > 0:
                filled_fields += 1
            
            # Check skills
            skills = parsed_data.get("skills", {})
            total_fields += 1
            if any(skills.get(skill_type, []) for skill_type in skills.keys()):
                filled_fields += 1
            
            confidence = (filled_fields / total_fields) * 100 if total_fields > 0 else 0
            return round(confidence, 2)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 50.0
    
    def _determine_risk_level(self, authenticity_score: int) -> str:
        """Determine risk level based on authenticity score"""
        if authenticity_score >= 85:
            return "low"
        elif authenticity_score >= 70:
            return "medium"
        else:
            return "high"
    
    def _fallback_analysis(self, text: str, traditional_data: Dict = None) -> Dict:
        """Fallback analysis when AI fails"""
        logger.warning("Using fallback analysis due to AI failure")
        
        # Basic text analysis
        words = text.lower().split()
        
        # Extract basic info using regex
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        phone_pattern = r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        
        email_match = re.search(email_pattern, text)
        phone_match = re.search(phone_pattern, text)
        
        # Basic name extraction (first few words that are capitalized)
        lines = text.split('\n')
        potential_name = ""
        for line in lines[:5]:  # Check first 5 lines
            words_in_line = line.strip().split()
            if len(words_in_line) >= 2 and all(word[0].isupper() for word in words_in_line[:2]):
                potential_name = ' '.join(words_in_line[:2])
                break
        
        fallback_data = {
            "personal_info": {
                "full_name": potential_name,
                "first_name": potential_name.split()[0] if potential_name else "",
                "last_name": potential_name.split()[-1] if potential_name and len(potential_name.split()) > 1 else ""
            },
            "contact_info": {
                "email": email_match.group(0) if email_match else "",
                "phone": phone_match.group(0) if phone_match else "",
                "linkedin": "",
                "location": ""
            },
            "professional_summary": "",
            "skills": {
                "programming_languages": [],
                "frameworks_libraries": [],
                "databases": [],
                "cloud_platforms": [],
                "tools_technologies": [],
                "soft_skills": []
            },
            "experience": {
                "total_years": 0,
                "positions": []
            },
            "education": {
                "degrees": []
            },
            "certifications": [],
            "projects": [],
            "languages": [],
            "achievements": [],
            "ai_confidence": 25.0,
            "extraction_method": "fallback_regex"
        }
        
        return {
            "parsed_data": fallback_data,
            "fraud_analysis": {
                "overall_risk_score": 0.5,
                "risk_level": "medium",
                "detected_issues": ["AI analysis failed - manual review required"],
                "detailed_analysis": {"note": "Fallback analysis used"}
            },
            "insights": {
                "strengths": ["Resume submitted"],
                "areas_for_improvement": ["AI analysis failed - manual review needed"],
                "market_positioning": "Unknown",
                "salary_estimate": "Unknown",
                "cultural_fit_indicators": [],
                "overall_score": 50
            },
            "interview_questions": [
                "Tell me about your background and experience.",
                "What interests you about this role?",
                "How do you handle challenging situations?"
            ]
        }
    
    def analyze_job_description(self, job_description: str, job_title: str) -> Dict:
        """PHASE 2 OPTIMIZED: Use GPT-3.5-turbo to extract structured requirements from job description"""
        try:
            prompt = f"""
            Analyze this job description and extract structured requirements. Return ONLY valid JSON:
            
            {{
                "required_skills": {{
                    "programming_languages": [],
                    "frameworks_libraries": [],
                    "databases": [],
                    "cloud_platforms": [],
                    "tools_technologies": [],
                    "soft_skills": []
                }},
                "experience_requirements": {{
                    "minimum_years": 0,
                    "preferred_years": 0,
                    "level": "mid",
                    "specific_experience": []
                }},
                "education_requirements": {{
                    "minimum_degree": "",
                    "preferred_degree": "",
                    "required_fields": [],
                    "certifications": []
                }},
                "job_analysis": {{
                    "department": "",
                    "job_type": "full-time",
                    "seniority_level": "mid",
                    "key_responsibilities": [],
                    "growth_opportunities": []
                }},
                "salary_insights": {{
                    "estimated_range": "",
                    "factors_affecting_salary": []
                }}
            }}
            
            Job Title: {job_title}
            Job Description:
            {job_description[:2000]}
            
            Be concise but accurate.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # PHASE 2: Switched from GPT-4 (90% cost reduction)
                messages=[
                    {"role": "system", "content": "You are an HR analyst. Extract job requirements in valid JSON format only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800  # PHASE 1: Reduced from 2000 tokens (60% reduction)
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            parsed_requirements = json.loads(result)
            
            # Add metadata
            parsed_requirements["ai_confidence"] = self._calculate_job_confidence(parsed_requirements)
            parsed_requirements["extraction_method"] = "openai_gpt3.5_optimized"
            
            return parsed_requirements
            
        except Exception as e:
            logger.error(f"Error in AI job analysis: {str(e)}")
            return self._fallback_job_analysis(job_description, job_title)
    
    def match_candidate_to_job(self, candidate_data: Dict, job_requirements: Dict) -> Dict:
        """PHASE 2 OPTIMIZED: Use GPT-3.5-turbo for candidate-job matching"""
        try:
            # Simplify candidate data to reduce token usage
            simplified_candidate = {
                "skills": candidate_data.get("parsed_data", {}).get("skills", {}),
                "experience": candidate_data.get("parsed_data", {}).get("experience", {}),
                "education": candidate_data.get("parsed_data", {}).get("education", {})
            }
            
            prompt = f"""
            Match candidate to job requirements. Return ONLY valid JSON:
            
            {{
                "overall_compatibility_score": 75,
                "compatibility_breakdown": {{
                    "skills_match": {{
                        "score": 80,
                        "matched_skills": [],
                        "missing_skills": [],
                        "bonus_skills": []
                    }},
                    "experience_match": {{
                        "score": 70,
                        "years_comparison": "",
                        "level_match": "",
                        "relevant_experience": []
                    }},
                    "education_match": {{
                        "score": 85,
                        "degree_compatibility": "",
                        "field_relevance": ""
                    }}
                }},
                "strengths_for_role": [],
                "concerns_for_role": [],
                "interview_focus_areas": [],
                "recommendation": {{
                    "decision": "good_fit",
                    "confidence": 7,
                    "reasoning": "",
                    "next_steps": ""
                }},
                "salary_fit": {{
                    "candidate_level_estimate": "",
                    "market_rate_analysis": ""
                }}
            }}
            
            Candidate: {json.dumps(simplified_candidate)}
            Job Requirements: {json.dumps(job_requirements)}
            
            Be concise and accurate.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # PHASE 2: Switched from GPT-4 (90% cost reduction)
                messages=[
                    {"role": "system", "content": "You are a technical recruiter. Provide candidate-job matching in valid JSON format only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=600  # PHASE 1: Reduced from 2000 tokens (70% reduction)
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error in AI candidate matching: {str(e)}")
            return self._fallback_candidate_match(candidate_data, job_requirements)
    
    def generate_bulk_job_matches(self, candidates: List[Dict], job_requirements: Dict) -> List[Dict]:
        """PHASE 1 & 2 OPTIMIZED: Generate job matches for multiple candidates efficiently"""
        try:
            # Prepare simplified candidate summaries for bulk processing
            candidate_summaries = []
            for candidate in candidates[:20]:  # PHASE 1: Limit to 20 candidates to reduce tokens
                summary = {
                    "id": candidate["id"],
                    "name": candidate["parsed_data"].get("personal_info", {}).get("full_name", "Unknown"),
                    "skills": list(candidate["parsed_data"].get("skills", {}).get("programming_languages", []))[:5],  # Limit skills
                    "experience_years": candidate["parsed_data"].get("experience", {}).get("total_years", 0),
                    "overall_score": candidate["ranking_score"].get("total_score", 0)
                }
                candidate_summaries.append(summary)
            
            prompt = f"""
            Rank these candidates for the job. Return ONLY valid JSON array:
            
            [
                {{
                    "candidate_id": "string",
                    "compatibility_score": 75,
                    "quick_assessment": "brief assessment",
                    "top_strengths": ["strength1", "strength2"],
                    "main_concerns": ["concern1"],
                    "recommendation": "good_fit"
                }}
            ]
            
            Job Requirements: {json.dumps(job_requirements, separators=(',', ':'))}
            Candidates: {json.dumps(candidate_summaries, separators=(',', ':'))}
            
            Sort by compatibility score (highest first). Be concise.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # PHASE 2: Switched from GPT-4 (90% cost reduction)
                messages=[
                    {"role": "system", "content": "You are a recruiter doing rapid candidate screening. Return valid JSON array only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800  # PHASE 1: Reduced from 2000+ tokens (60% reduction)
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            matches = json.loads(result)
            
            # Ensure all candidates have matches (fill in missing ones with basic data)
            matched_ids = {match["candidate_id"] for match in matches}
            for candidate in candidate_summaries:
                if candidate["id"] not in matched_ids:
                    matches.append({
                        "candidate_id": candidate["id"],
                        "compatibility_score": 50,
                        "quick_assessment": "Basic match - needs manual review",
                        "top_strengths": ["Experience"],
                        "main_concerns": ["Needs evaluation"],
                        "recommendation": "potential_fit"
                    })
            
            return matches
            
        except Exception as e:
            logger.error(f"Error in bulk job matching: {str(e)}")
            # Fallback to basic scoring
            return [{
                "candidate_id": candidate["id"],
                "compatibility_score": candidate["ranking_score"].get("total_score", 50),
                "quick_assessment": "AI analysis failed - manual review required",
                "top_strengths": ["Resume submitted"],
                "main_concerns": ["Needs manual evaluation"],
                "recommendation": "potential_fit"
            } for candidate in candidates[:20]]
    
    def suggest_job_improvements(self, job_description: str, market_analysis: Dict = None) -> Dict:
        """Suggest improvements to job descriptions to attract better candidates"""
        try:
            prompt = f"""
            Analyze this job description and suggest improvements to make it more attractive and effective for recruiting.
            
            Job Description:
            {job_description}
            
            Market Analysis (if available):
            {json.dumps(market_analysis, indent=2) if market_analysis else "Not provided"}
            
            Provide suggestions in JSON format:
            {{
                "overall_assessment": "string assessment of current job description",
                "improvements": {{
                    "clarity": ["suggestions for clearer requirements"],
                    "attractiveness": ["suggestions to make role more appealing"],
                    "inclusivity": ["suggestions for more inclusive language"],
                    "competitiveness": ["suggestions based on market standards"]
                }},
                "missing_elements": ["list of important elements that should be added"],
                "red_flags": ["list of potential issues that might deter candidates"],
                "suggested_rewrite": {{
                    "title": "improved job title",
                    "summary": "improved job summary",
                    "key_improvements": ["list of main changes made"]
                }},
                "target_candidate_profile": "description of ideal candidate this job would attract"
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert talent acquisition specialist with deep knowledge of effective job posting strategies."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1500
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error in job improvement suggestions: {str(e)}")
            return {"error": str(e)}
    
    def _calculate_job_confidence(self, job_data: Dict) -> float:
        """Calculate confidence score for job analysis"""
        total_fields = 0
        filled_fields = 0
        
        # Check required skills
        skills = job_data.get("required_skills", {})
        total_fields += 6
        filled_fields += sum(1 for v in skills.values() if v and len(v) > 0)
        
        # Check experience requirements
        experience = job_data.get("experience_requirements", {})
        total_fields += 4
        filled_fields += sum(1 for v in experience.values() if v)
        
        # Check education requirements
        education = job_data.get("education_requirements", {})
        total_fields += 4
        filled_fields += sum(1 for v in education.values() if v)
        
        # Check job analysis
        analysis = job_data.get("job_analysis", {})
        total_fields += 7
        filled_fields += sum(1 for v in analysis.values() if v)
        
        return filled_fields / total_fields if total_fields > 0 else 0.0
    
    def _fallback_job_analysis(self, job_description: str, job_title: str) -> Dict:
        """Fallback job analysis using basic text processing"""
        logger.info("Using fallback job analysis")
        
        # Basic keyword extraction
        programming_languages = []
        frameworks = []
        databases = []
        
        # Simple keyword matching
        lang_keywords = ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust']
        framework_keywords = ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'express', 'laravel']
        db_keywords = ['mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'oracle']
        
        description_lower = job_description.lower()
        
        for lang in lang_keywords:
            if lang in description_lower:
                programming_languages.append(lang.title())
        
        for fw in framework_keywords:
            if fw in description_lower:
                frameworks.append(fw.title())
        
        for db in db_keywords:
            if db in description_lower:
                databases.append(db.title())
        
        # Extract years of experience
        years_match = re.search(r'(\d+)\+?\s*years?\s*(?:of\s*)?experience', description_lower)
        min_years = int(years_match.group(1)) if years_match else 0
        
        return {
            "required_skills": {
                "programming_languages": programming_languages,
                "frameworks_libraries": frameworks,
                "databases": databases,
                "cloud_platforms": [],
                "tools_technologies": [],
                "soft_skills": []
            },
            "experience_requirements": {
                "minimum_years": min_years,
                "preferred_years": min_years + 2,
                "level": "mid" if min_years >= 3 else "entry",
                "specific_experience": []
            },
            "education_requirements": {
                "minimum_degree": "Bachelor's",
                "preferred_degree": "Bachelor's",
                "required_fields": [],
                "certifications": []
            },
            "job_analysis": {
                "department": "Technology",
                "job_type": "full-time",
                "seniority_level": "mid" if min_years >= 3 else "entry",
                "key_responsibilities": [],
                "growth_opportunities": [],
                "team_size": None,
                "reporting_structure": None
            },
            "salary_insights": {
                "estimated_range": "Market rate",
                "factors_affecting_salary": []
            },
            "ai_confidence": 0.3,
            "extraction_method": "fallback_basic"
        }
    
    def _fallback_candidate_match(self, candidate_data: Dict, job_requirements: Dict) -> Dict:
        """Fallback candidate matching using basic comparison"""
        logger.info("Using fallback candidate matching")
        
        # Basic compatibility calculation
        skills_score = 50  # Default
        experience_score = 50  # Default
        education_score = 50  # Default
        
        overall_score = (skills_score + experience_score + education_score) / 3
        
        return {
            "overall_compatibility_score": overall_score,
            "compatibility_breakdown": {
                "skills_match": {
                    "score": skills_score,
                    "matched_skills": [],
                    "missing_skills": [],
                    "bonus_skills": []
                },
                "experience_match": {
                    "score": experience_score,
                    "years_comparison": "Analysis not available",
                    "level_match": "Analysis not available",
                    "relevant_experience": []
                },
                "education_match": {
                    "score": education_score,
                    "degree_compatibility": "Analysis not available",
                    "field_relevance": "Analysis not available"
                }
            },
            "strengths_for_role": ["Manual review required"],
            "concerns_for_role": ["AI analysis failed"],
            "interview_focus_areas": ["General assessment"],
            "recommendation": {
                "decision": "potential_fit",
                "confidence": 3,
                "reasoning": "AI analysis unavailable - manual review recommended",
                "next_steps": "Conduct detailed manual assessment"
            },
            "salary_fit": {
                "candidate_level_estimate": "Unknown",
                "market_rate_analysis": "Analysis not available"
            }
        }
    
    def analyze_search_query(self, search_query: str) -> Dict:
        """Use AI to interpret natural language search queries and extract filters"""
        try:
            prompt = f"""
            Analyze this natural language search query for candidate search and extract relevant filters.
            
            Search Query: "{search_query}"
            
            Extract filters in JSON format:
            {{
                "extracted_filters": {{
                    "min_experience": "number or null",
                    "max_experience": "number or null", 
                    "required_skills": ["list of skills mentioned"],
                    "programming_languages": ["list of programming languages"],
                    "frameworks": ["list of frameworks/libraries"],
                    "job_titles": ["list of job titles or roles"],
                    "education_level": "string or null",
                    "location": "string or null",
                    "salary_range": "string or null"
                }},
                "search_intent": "string describing what the user is looking for",
                "confidence": "number 0-1 indicating confidence in interpretation",
                "suggested_refinements": ["list of suggestions to refine the search"]
            }}
            
            Examples:
            - "Find Python developers with 3+ years" → min_experience: 3, programming_languages: ["Python"]
            - "Senior React engineers in NYC" → required_skills: ["React"], job_titles: ["Senior Engineer"], location: "NYC"
            - "Full stack developers with Django experience" → required_skills: ["Django"], job_titles: ["Full Stack Developer"]
            """
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert search query interpreter for recruitment systems."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=800
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error in search query analysis: {str(e)}")
            return {
                "extracted_filters": {},
                "search_intent": f"Search for: {search_query}",
                "confidence": 0.1,
                "suggested_refinements": ["Please try a more specific search"]
            }

    def process_conversational_search(self, user_message: str, conversation_history: List[Dict], context: Dict) -> Dict:
        """Process conversational search queries with intelligent responses - OPTIMIZED for token efficiency"""
        try:
            # Import database here to avoid circular imports
            from database import Database
            db = Database()
            
            # OPTIMIZATION 1: Check if this is a simple search query
            if self._is_simple_search_query(user_message):
                logger.info("OPTIMIZATION: Using rule-based intent detection (no AI call)")
                query_analysis = self._rule_based_intent_detection(user_message)
            else:
                # OPTIMIZATION 2: Check cache first for complex queries
                cache_key = hash(user_message.lower())
                if cache_key in self._intent_cache:
                    logger.info("OPTIMIZATION: Using cached intent analysis")
                    query_analysis = self._intent_cache[cache_key]
                else:
                    # Build minimal conversation context (only last 2 messages)
                    conversation_context = ""
                    if conversation_history:
                        for msg in conversation_history[-2:]:  # Reduced from 5 to 2 messages
                            role = msg.get('role', 'user')
                            content = msg.get('content', '')[:100]  # Truncate to 100 chars
                            conversation_context += f"{role}: {content}\n"
                    
                    query_analysis = self._analyze_conversational_intent(user_message, conversation_context)
                    # Cache the result
                    self._intent_cache[cache_key] = query_analysis
            
            response_data = {
                "message": user_message,
                "query_type": query_analysis.get("query_type", "search"),
                "intent": query_analysis.get("intent", ""),
                "ai_response": "",
                "candidates": [],
                "comparison": None,
                "insights": [],
                "suggestions": [],
                "follow_up_questions": []
            }
            
            # Process based on query type
            if query_analysis.get("query_type") == "comparison":
                response_data = self._handle_comparison_query(user_message, query_analysis, db)
            elif query_analysis.get("query_type") == "analysis":
                response_data = self._handle_analysis_query(user_message, query_analysis, db)
            elif query_analysis.get("query_type") == "search":
                response_data = self._handle_search_query_optimized(user_message, query_analysis, db)
            else:
                response_data = self._handle_general_query(user_message, query_analysis, db)
            
            # Add conversation metadata
            response_data["conversation_id"] = context.get("conversation_id", "default")
            response_data["timestamp"] = context.get("timestamp", "")
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error in conversational search: {str(e)}")
            return {
                "message": user_message,
                "query_type": "error",
                "ai_response": "I apologize, but I encountered an error processing your request. Please try rephrasing your question.",
                "error": str(e)
            }

    def _analyze_conversational_intent(self, user_message: str, conversation_context: str) -> Dict:
        """Analyze the intent and type of conversational query"""
        try:
            prompt = f"""
            Analyze this conversational query about candidate search and determine the intent and type.
            
            Conversation Context:
            {conversation_context}
            
            Current Message: "{user_message}"
            
            Determine the query type and extract relevant information. Return JSON:
            {{
                "query_type": "search|comparison|analysis|recommendation|general",
                "intent": "detailed description of what user wants",
                "entities": {{
                    "skills": ["list of skills mentioned"],
                    "experience_level": "junior|mid|senior|executive",
                    "locations": ["list of locations"],
                    "comparison_criteria": "skills|experience|education|overall",
                    "candidate_count": "number of candidates to find/compare"
                }},
                "action_required": "search|compare|analyze|recommend|explain",
                "confidence": 0.95
            }}
            
            Query Type Examples:
            - "Find Python developers" → search
            - "Compare these two candidates" → comparison  
            - "What makes a good React developer?" → analysis
            - "Who should I hire for this role?" → recommendation
            - "Tell me about candidate skills" → general
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert at understanding recruitment conversations and search intents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=400
            )
            
            result = response.choices[0].message.content.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error analyzing conversational intent: {str(e)}")
            return {
                "query_type": "search",
                "intent": "Find candidates based on the query",
                "entities": {},
                "action_required": "search",
                "confidence": 0.3
            }

    def _create_lightweight_candidate_summary(self, candidate: Dict) -> Dict:
        """Create a lightweight summary of candidate for chat responses"""
        try:
            parsed_data = candidate.get("parsed_data", {})
            ranking_score = candidate.get("ranking_score", {})
            fraud_analysis = candidate.get("fraud_analysis", {})
            
            # Extract name with fallback
            personal_info = parsed_data.get("personal_info", {})
            name = personal_info.get("full_name", "")
            if not name:
                name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip()
            if not name:
                filename = candidate.get("filename", "Unknown Candidate")
                if isinstance(filename, str):
                    name = filename.replace(".pdf", "").replace(".docx", "").replace("_", " ").title()
                else:
                    name = "Unknown Candidate"
            
            # Extract experience with proper handling
            experience_data = parsed_data.get("experience", {})
            experience_years = experience_data.get("total_years", 0)
            if experience_years is None or not isinstance(experience_years, (int, float)):
                experience_years = 0
            
            # Extract skills with proper handling
            skills_data = parsed_data.get("skills", {})
            programming_languages = skills_data.get("programming_languages", [])
            if not isinstance(programming_languages, list):
                programming_languages = []
            # Filter out None values and ensure all are strings
            programming_languages = [skill for skill in programming_languages if skill and isinstance(skill, str)]
            
            # Extract risk level with fallback
            risk_level = fraud_analysis.get("risk_level", "")
            if not risk_level or risk_level == "unknown":
                # Calculate risk based on score
                total_score = ranking_score.get("total_score", 0)
                if total_score is None:
                    total_score = 0
                if total_score >= 80:
                    risk_level = "low"
                elif total_score >= 60:
                    risk_level = "medium"
                else:
                    risk_level = "high"
            
            # Extract education level
            education_level = self._extract_highest_education(parsed_data.get("education", {}))
            
            # Extract and clean professional summary
            summary = parsed_data.get("professional_summary", "")
            if not isinstance(summary, str):
                summary = ""
            
            # Safely truncate summary
            if summary and len(summary) > 200:
                summary = summary[:200] + "..."
            
            # Extract email safely
            contact_info = parsed_data.get("contact_info", {})
            email = contact_info.get("email", "")
            if not isinstance(email, str):
                email = ""
            
            # Extract total score safely
            total_score = ranking_score.get("total_score", 0)
            if total_score is None or not isinstance(total_score, (int, float)):
                total_score = 0
            
            return {
                "id": candidate.get("id"),
                "filename": candidate.get("filename", ""),
                "name": name,
                "email": email,
                "experience_years": int(experience_years),
                "top_skills": programming_languages[:3],
                "education_level": education_level,
                "total_score": int(total_score),
                "risk_level": risk_level,
                "summary": summary
            }
        except Exception as e:
            logger.error(f"Error creating lightweight candidate summary: {str(e)}")
            # Return a safe fallback
            filename = candidate.get("filename", "Unknown")
            if isinstance(filename, str):
                safe_name = filename.replace(".pdf", "").replace(".docx", "").replace("_", " ").title()
            else:
                safe_name = "Unknown Candidate"
                
            return {
                "id": candidate.get("id", "unknown"),
                "filename": candidate.get("filename", "Unknown"),
                "name": safe_name,
                "email": "",
                "experience_years": 0,
                "top_skills": [],
                "education_level": "Not specified",
                "total_score": 0,
                "risk_level": "medium",
                "summary": ""
            }

    def _extract_highest_education(self, education_data: Dict) -> str:
        """Extract the highest education level from education data"""
        try:
            degrees = education_data.get("degrees", [])
            if not degrees:
                return "Not specified"
            
            # Handle empty list
            if not isinstance(degrees, list) or len(degrees) == 0:
                return "Not specified"
            
            # If degrees is a list of dictionaries
            if isinstance(degrees[0], dict):
                degree_levels = ["phd", "doctorate", "ph.d", "doctor", "master", "mba", "ms", "ma", "bachelor", "bs", "ba", "b.tech", "btech", "associate", "diploma", "certificate"]
                
                # Look for highest degree level
                for level in degree_levels:
                    for degree in degrees:
                        degree_str = degree.get("degree", "").lower()
                        if level in degree_str:
                            return degree.get("degree", "").title()
                
                # If no match found, return the first degree
                first_degree = degrees[0].get("degree", "")
                return first_degree.title() if first_degree else "Not specified"
            else:
                # If degrees is a list of strings
                first_degree = str(degrees[0]) if degrees else ""
                return first_degree.title() if first_degree else "Not specified"
                
        except Exception as e:
            logger.error(f"Error extracting education: {str(e)}")
            return "Not specified"

    def _handle_search_query_optimized(self, user_message: str, query_analysis: Dict, db) -> Dict:
        """Handle search-type conversational queries - optimized for token efficiency"""
        try:
            # OPTIMIZATION 3: Skip expensive AI search analysis for simple queries
            if self._is_simple_search_query(user_message):
                # Use simple rule-based filter extraction
                filters = self._extract_filters_simple(user_message)
                logger.info("OPTIMIZATION: Using simple filter extraction (no AI call)")
            else:
                # Only use AI for complex search analysis
                search_analysis = self.analyze_search_query(user_message)
                filters = search_analysis.get("extracted_filters", {})
            
            # Perform the search
            all_candidates = db.search_candidates(user_message, filters)
            
            # Perform intelligent skill-specific ranking (this is efficient, no AI)
            ranked_candidates = self._intelligent_skill_ranking(all_candidates, user_message, filters)
            
            # Create lightweight summaries for chat response
            lightweight_candidates = [
                self._create_lightweight_candidate_summary(candidate) 
                for candidate in ranked_candidates[:10]
            ]
            
            # OPTIMIZATION 4: Generate simple response instead of AI response for basic searches
            if self._is_simple_search_query(user_message):
                ai_response = self._generate_simple_search_response(user_message, ranked_candidates, filters)
                insights = self._generate_simple_insights(ranked_candidates)
                logger.info("OPTIMIZATION: Using simple response generation (no AI call)")
            else:
                # Only use AI for complex response generation
                ai_response = self._generate_search_response(user_message, ranked_candidates, filters)
                insights = self._generate_search_insights(ranked_candidates, filters)
            
            return {
                "message": user_message,
                "query_type": "search",
                "intent": query_analysis.get("intent", ""),
                "ai_response": ai_response,
                "candidates": lightweight_candidates,  # Use lightweight summaries
                "total_found": len(all_candidates),
                "filters_applied": filters,
                "insights": insights,
                "suggestions": self._generate_search_suggestions(user_message, ranked_candidates),
                "follow_up_questions": [
                    "Would you like me to compare the top candidates?",
                    "Should I filter by specific experience level?",
                    "Do you want to see candidates from a particular location?"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error handling search query: {str(e)}")
            return {"error": str(e)}
    
    def _extract_filters_simple(self, user_message: str) -> Dict:
        """Simple rule-based filter extraction - no AI needed"""
        filters = {}
        message_lower = user_message.lower()
        
        # Extract experience requirements
        import re
        exp_match = re.search(r'(\d+)\+?\s*years?', message_lower)
        if exp_match:
            years = int(exp_match.group(1))
            filters["min_experience"] = years
        
        # Extract programming languages and frameworks
        tech_skills = []
        skill_keywords = {
            'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript', 'js': 'JavaScript',
            'typescript': 'TypeScript', 'react': 'React', 'angular': 'Angular', 'vue': 'Vue',
            'node': 'Node.js', 'nodejs': 'Node.js', 'django': 'Django', 'flask': 'Flask',
            'spring': 'Spring', 'sql': 'SQL', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL',
            'mongodb': 'MongoDB', 'aws': 'AWS', 'azure': 'Azure', 'docker': 'Docker'
        }
        
        for keyword, skill_name in skill_keywords.items():
            if keyword in message_lower:
                tech_skills.append(skill_name)
        
        if tech_skills:
            filters["programming_languages"] = tech_skills
        
        return filters
    
    def _generate_simple_search_response(self, query: str, candidates: List[Dict], filters: Dict) -> str:
        """Generate simple search response without AI - much faster"""
        candidate_count = len(candidates)
        
        if candidate_count == 0:
            return f"I couldn't find any candidates matching '{query}'. Try broadening your search criteria."
        
        response = f"I found {candidate_count} candidates matching '{query}'. "
        
        if candidate_count > 10:
            response += "Here are the top 10 results. "
        
        # Add simple insights
        if candidates:
            top_candidate = candidates[0]
            top_name = top_candidate.get("parsed_data", {}).get("personal_info", {}).get("full_name", "Top candidate")
            top_score = top_candidate.get("skill_relevance_score", 0)
            if top_score > 0:
                response += f"{top_name} ranks highest with a skill relevance score of {top_score:.1f}. "
        
        response += "Would you like me to compare the top candidates or provide more details?"
        
        return response
    
    def _generate_simple_insights(self, candidates: List[Dict]) -> List[str]:
        """Generate simple insights without AI"""
        insights = []
        
        if not candidates:
            return ["No matching candidates found"]
        
        try:
            # Count candidates with different experience levels
            def get_experience_years(candidate):
                exp_data = candidate.get("parsed_data", {}).get("experience", {})
                years = exp_data.get("total_years") or exp_data.get("years_experience") or 0
                return years if isinstance(years, (int, float)) and years is not None else 0
            
            junior_count = sum(1 for c in candidates if get_experience_years(c) <= 2)
            mid_count = sum(1 for c in candidates if 3 <= get_experience_years(c) <= 5)
            senior_count = sum(1 for c in candidates if get_experience_years(c) > 5)
            
            if senior_count > 0:
                insights.append(f"{senior_count} senior candidates (5+ years experience)")
            if mid_count > 0:
                insights.append(f"{mid_count} mid-level candidates (3-5 years experience)")
            if junior_count > 0:
                insights.append(f"{junior_count} junior candidates (0-2 years experience)")
            
            # Quality insights
            def get_score(candidate):
                score = candidate.get("ranking_score", {}).get("total_score")
                if score is None:
                    return 0
                return score if isinstance(score, (int, float)) else 0
            
            high_quality = sum(1 for c in candidates if get_score(c) > 70)
            if high_quality > 0:
                insights.append(f"{high_quality} high-quality candidates (70+ score)")
                
        except Exception as e:
            logger.error(f"Error generating simple insights: {str(e)}")
            insights.append("Candidate analysis completed")
        
        return insights

    def _intelligent_skill_ranking(self, candidates: List[Dict], query: str, filters: Dict, use_ai_enhancement: bool = False) -> List[Dict]:
        """Perform intelligent skill-specific ranking based on depth of experience"""
        try:
            # Extract target skills from query and filters
            target_skills = []
            target_skills.extend(filters.get("programming_languages", []))
            target_skills.extend(filters.get("required_skills", []))
            target_skills.extend(filters.get("frameworks", []))
            
            # If no specific skills in filters, extract from query text
            if not target_skills:
                query_lower = query.lower()
                
                # Role-based skill mapping
                role_to_skills = {
                    # Frontend roles
                    'frontend': ['React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'front-end': ['React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'front end': ['React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'ui developer': ['React', 'Angular', 'Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'react developer': ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    'angular developer': ['Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
                    'vue developer': ['Vue', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
                    
                    # Backend roles
                    'backend': ['Python', 'Java', 'Node.js', 'Express', 'Django', 'Flask', 'Spring'],
                    'back-end': ['Python', 'Java', 'Node.js', 'Express', 'Django', 'Flask', 'Spring'],
                    'back end': ['Python', 'Java', 'Node.js', 'Express', 'Django', 'Flask', 'Spring'],
                    'api developer': ['Python', 'Java', 'Node.js', 'Express', 'Django', 'Flask', 'Spring'],
                    'python developer': ['Python', 'Django', 'Flask', 'FastAPI'],
                    'java developer': ['Java', 'Spring', 'Spring Boot'],
                    'node developer': ['Node.js', 'Express', 'JavaScript', 'TypeScript'],
                    
                    # Full stack roles
                    'fullstack': ['React', 'Angular', 'Vue', 'JavaScript', 'Python', 'Java', 'Node.js'],
                    'full-stack': ['React', 'Angular', 'Vue', 'JavaScript', 'Python', 'Java', 'Node.js'],
                    'full stack': ['React', 'Angular', 'Vue', 'JavaScript', 'Python', 'Java', 'Node.js'],
                    
                    # Data roles
                    'data scientist': ['Python', 'R', 'SQL', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow'],
                    'data analyst': ['Python', 'R', 'SQL', 'Tableau', 'Power BI', 'Pandas'],
                    'machine learning': ['Python', 'R', 'TensorFlow', 'PyTorch', 'Scikit-learn'],
                    'ml engineer': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Docker', 'Kubernetes'],
                    
                    # Database roles
                    'database': ['SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis'],
                    'dba': ['SQL', 'MySQL', 'PostgreSQL', 'Oracle'],
                    'database administrator': ['SQL', 'MySQL', 'PostgreSQL', 'Oracle'],
                    
                    # DevOps roles
                    'devops': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Jenkins', 'Git'],
                    'cloud engineer': ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes'],
                    'sre': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'Python', 'Go'],
                    
                    # Mobile roles
                    'mobile developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Java'],
                    'ios developer': ['Swift', 'Objective-C', 'Xcode'],
                    'android developer': ['Kotlin', 'Java', 'Android Studio'],
                }
                
                # Check for role-based skills first
                for role, skills in role_to_skills.items():
                    if role in query_lower:
                        target_skills.extend(skills)
                        logger.info(f"DEBUG: Detected role '{role}', mapping to skills: {skills}")
                        break
                
                # If no role detected, check for specific technology skills
                if not target_skills:
                    common_skills = {
                        # Programming languages
                        'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript', 'typescript': 'TypeScript', 
                        'c++': 'C++', 'c#': 'C#', 'php': 'PHP', 'ruby': 'Ruby', 'go': 'Go', 'rust': 'Rust',
                        # Frontend frameworks
                        'react': 'React', 'angular': 'Angular', 'vue': 'Vue', 'svelte': 'Svelte',
                        # Backend frameworks
                        'django': 'Django', 'flask': 'Flask', 'spring': 'Spring', 'express': 'Express', 'laravel': 'Laravel',
                        # Databases
                        'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'mongodb': 'MongoDB', 'redis': 'Redis', 
                        'sql': 'SQL', 'nosql': 'NoSQL',
                        # Cloud platforms
                        'aws': 'AWS', 'azure': 'Azure', 'gcp': 'Google Cloud', 'docker': 'Docker', 'kubernetes': 'Kubernetes',
                        # Data science
                        'machine learning': 'Machine Learning', 'ml': 'Machine Learning', 'ai': 'Artificial Intelligence',
                        'data science': 'Data Science', 'pandas': 'Pandas', 'numpy': 'NumPy'
                    }
                    
                    for skill_key, skill_name in common_skills.items():
                        if skill_key in query_lower:
                            target_skills.append(skill_name)
                            logger.info(f"DEBUG: Detected specific skill: {skill_name}")
                
                # Remove duplicates while preserving order
                target_skills = list(dict.fromkeys(target_skills))
            
            if not target_skills:
                # No specific skills to rank by, return original order
                logger.info(f"No target skills found for query: {query}")
                return candidates
            
            logger.info(f"DEBUG: Ranking candidates for skills: {target_skills} (AI enhancement: {use_ai_enhancement})")
            
            # Score each candidate based on skill depth
            scored_candidates = []
            for candidate in candidates:
                if use_ai_enhancement:
                    skill_score = self._calculate_hybrid_skill_score(candidate, target_skills, use_ai=True)
                else:
                    skill_score = self._calculate_skill_depth_score(candidate, target_skills)
                
                candidate_copy = candidate.copy()
                candidate_copy['skill_relevance_score'] = skill_score
                
                # Log candidate skill analysis for debugging
                name = candidate.get("parsed_data", {}).get("personal_info", {}).get("full_name", "Unknown")
                base_score = candidate.get("ranking_score", {}).get("total_score", 0)
                logger.info(f"DEBUG: {name}: Skill score = {skill_score:.1f}, Base score = {base_score}")
                
                scored_candidates.append(candidate_copy)
            
            # Filter out candidates with very low skill relevance (less than 10 points)
            # This ensures we only show candidates who actually have some of the target skills
            relevant_candidates = [c for c in scored_candidates if c.get('skill_relevance_score', 0) >= 10]
            
            # If no candidates meet the skill threshold, return top candidates by general score
            if not relevant_candidates:
                logger.warning(f"DEBUG: No candidates found with relevant skills for: {target_skills}")
                # Return candidates sorted by general score but with low skill relevance noted
                for candidate in scored_candidates:
                    candidate['skill_relevance_score'] = 0
                return sorted(scored_candidates, key=lambda x: x.get("ranking_score", {}).get("total_score", 0), reverse=True)
            
            # Sort by skill relevance score (descending)
            relevant_candidates.sort(key=lambda x: x.get('skill_relevance_score', 0), reverse=True)
            
            logger.info(f"DEBUG: Filtered to {len(relevant_candidates)} relevant candidates out of {len(candidates)} total")
            
            # Log final ranking
            for i, candidate in enumerate(relevant_candidates[:3]):
                name = candidate.get("parsed_data", {}).get("personal_info", {}).get("full_name", "Unknown")
                skill_score = candidate.get('skill_relevance_score', 0)
                logger.info(f"DEBUG: Final rank #{i+1}: {name} with skill score {skill_score:.1f}")
            
            return relevant_candidates
            
        except Exception as e:
            logger.error(f"Error in intelligent skill ranking: {str(e)}")
            return candidates

    def _calculate_skill_depth_score(self, candidate: Dict, target_skills: List[str]) -> float:
        """Calculate skill depth score based on skill matches, project experience, work history, and certifications"""
        try:
            parsed_data = candidate.get("parsed_data", {})
            skills_data = parsed_data.get("skills", {})
            base_score = candidate.get("ranking_score", {}).get("total_score", 0)
            if base_score is None:
                base_score = 0
            
            # Get candidate name for debugging
            candidate_name = parsed_data.get("personal_info", {}).get("full_name", "Unknown")
            
            # Extract all skills from candidate
            all_skills = []
            
            # Programming languages
            prog_langs = skills_data.get("programming_languages", [])
            if prog_langs and isinstance(prog_langs, list):
                all_skills.extend([skill for skill in prog_langs if skill and isinstance(skill, str)])
            
            # Frameworks and libraries
            frameworks = skills_data.get("frameworks_libraries", [])
            if frameworks and isinstance(frameworks, list):
                all_skills.extend([skill for skill in frameworks if skill and isinstance(skill, str)])
            
            # Technical skills
            tech_skills = skills_data.get("technical_skills", [])
            if tech_skills and isinstance(tech_skills, list):
                all_skills.extend([skill for skill in tech_skills if skill and isinstance(skill, str)])
            
            # Database skills
            db_skills = skills_data.get("databases", [])
            if db_skills and isinstance(db_skills, list):
                all_skills.extend([skill for skill in db_skills if skill and isinstance(skill, str)])
            
            # Cloud platforms
            cloud_skills = skills_data.get("cloud_platforms", [])
            if cloud_skills and isinstance(cloud_skills, list):
                all_skills.extend([skill for skill in cloud_skills if skill and isinstance(skill, str)])
            
            # Tools and technologies
            tools_skills = skills_data.get("tools_technologies", [])
            if tools_skills and isinstance(tools_skills, list):
                all_skills.extend([skill for skill in tools_skills if skill and isinstance(skill, str)])
            
            logger.info(f"DEBUG: {candidate_name} has skills: {all_skills}")
            
            # Calculate skill matches with depth analysis
            total_skill_score = 0
            skill_analysis = {}
            
            for target_skill in target_skills:
                if not target_skill or not isinstance(target_skill, str):
                    continue
                    
                target_lower = target_skill.lower()
                skill_depth_score = 0
                
                # 1. Check for basic skill presence (20 points max)
                skill_present = False
                for candidate_skill in all_skills:
                    if not candidate_skill:
                        continue
                    candidate_lower = candidate_skill.lower()
                    
                    if candidate_lower == target_lower:
                        skill_depth_score += 20  # Exact match
                        skill_present = True
                        break
                    elif self._is_meaningful_partial_match(target_lower, candidate_lower):
                        skill_depth_score += 10  # Partial match
                        skill_present = True
                        break
                
                if not skill_present:
                    continue  # Skip if skill not found
                
                # 2. Analyze work experience with this skill (30 points max)
                work_experience_score = self._calculate_work_experience_score(parsed_data, target_skill)
                skill_depth_score += work_experience_score
                
                # 3. Analyze project experience with this skill (25 points max)
                project_score = self._calculate_project_experience_score(parsed_data, target_skill)
                skill_depth_score += project_score
                
                # 4. Check for relevant certifications (15 points max)
                certification_score = self._calculate_certification_score(parsed_data, target_skill)
                skill_depth_score += certification_score
                
                # 5. Check education relevance (10 points max)
                education_score = self._calculate_education_relevance_score(parsed_data, target_skill)
                skill_depth_score += education_score
                
                total_skill_score += skill_depth_score
                skill_analysis[target_skill] = {
                    "total_score": skill_depth_score,
                    "work_experience": work_experience_score,
                    "projects": project_score,
                    "certifications": certification_score,
                    "education": education_score
                }
                
                logger.info(f"DEBUG: {candidate_name} - {target_skill} depth score: {skill_depth_score:.1f} (work: {work_experience_score:.1f}, projects: {project_score:.1f}, certs: {certification_score:.1f}, edu: {education_score:.1f})")
            
            # Add overall experience bonus (10 points max)
            experience_data = parsed_data.get("experience", {})
            total_experience = experience_data.get("total_years", 0) if experience_data else 0
            if total_experience is None:
                total_experience = 0
            experience_bonus = min(total_experience * 1, 10)  # 1 point per year, max 10
            
            final_score = total_skill_score + experience_bonus
            
            logger.info(f"DEBUG: {candidate_name} - Final skill depth score: {final_score:.1f} (skills: {total_skill_score:.1f}, exp_bonus: {experience_bonus:.1f})")
            logger.info(f"DEBUG: {candidate_name} - Skill analysis: {skill_analysis}")
            
            return final_score
            
        except Exception as e:
            logger.error(f"Error calculating skill depth score: {str(e)}")
            return 0

    def _calculate_work_experience_score(self, parsed_data: Dict, target_skill: str) -> float:
        """Calculate score based on work experience with the target skill"""
        try:
            experience_data = parsed_data.get("experience", {})
            positions = experience_data.get("positions", [])
            
            if not positions or not isinstance(positions, list):
                return 0
            
            total_score = 0
            target_lower = target_skill.lower()
            
            for position in positions:
                if not isinstance(position, dict):
                    continue
                
                position_score = 0
                
                # Check technologies used in this position (15 points max)
                technologies_used = position.get("technologies_used", [])
                if technologies_used and isinstance(technologies_used, list):
                    for tech in technologies_used:
                        if tech and isinstance(tech, str) and target_lower in tech.lower():
                            position_score += 15
                            break
                
                # Check responsibilities mentioning the skill (10 points max)
                responsibilities = position.get("responsibilities", [])
                if responsibilities and isinstance(responsibilities, list):
                    for resp in responsibilities:
                        if resp and isinstance(resp, str) and target_lower in resp.lower():
                            position_score += 10
                            break
                
                # Check job title relevance (5 points max)
                title = position.get("title", "")
                if title and isinstance(title, str) and target_lower in title.lower():
                    position_score += 5
                
                total_score += min(position_score, 20)  # Max 20 points per position
            
            return min(total_score, 30)  # Max 30 points total for work experience
            
        except Exception as e:
            logger.error(f"Error calculating work experience score: {str(e)}")
            return 0

    def _calculate_project_experience_score(self, parsed_data: Dict, target_skill: str) -> float:
        """Calculate score based on project experience with the target skill"""
        try:
            projects = parsed_data.get("projects", [])
            
            if not projects or not isinstance(projects, list):
                return 0
            
            total_score = 0
            target_lower = target_skill.lower()
            
            for project in projects:
                if not isinstance(project, dict):
                    continue
                
                project_score = 0
                
                # Check technologies used in project (10 points max)
                technologies = project.get("technologies", [])
                if technologies and isinstance(technologies, list):
                    for tech in technologies:
                        if tech and isinstance(tech, str) and target_lower in tech.lower():
                            project_score += 10
                            break
                
                # Check project description (5 points max)
                description = project.get("description", "")
                if description and isinstance(description, str) and target_lower in description.lower():
                    project_score += 5
                
                # Check project name (3 points max)
                name = project.get("name", "")
                if name and isinstance(name, str) and target_lower in name.lower():
                    project_score += 3
                
                total_score += min(project_score, 15)  # Max 15 points per project
            
            return min(total_score, 25)  # Max 25 points total for projects
            
        except Exception as e:
            logger.error(f"Error calculating project experience score: {str(e)}")
            return 0

    def _calculate_certification_score(self, parsed_data: Dict, target_skill: str) -> float:
        """Calculate score based on relevant certifications"""
        try:
            certifications = parsed_data.get("certifications", [])
            
            if not certifications or not isinstance(certifications, list):
                return 0
            
            total_score = 0
            target_lower = target_skill.lower()
            
            for cert in certifications:
                if cert and isinstance(cert, str) and target_lower in cert.lower():
                    total_score += 15  # 15 points per relevant certification
            
            return min(total_score, 15)  # Max 15 points total for certifications
            
        except Exception as e:
            logger.error(f"Error calculating certification score: {str(e)}")
            return 0

    def _calculate_education_relevance_score(self, parsed_data: Dict, target_skill: str) -> float:
        """Calculate score based on education relevance to the skill"""
        try:
            education_data = parsed_data.get("education", {})
            degrees = education_data.get("degrees", [])
            
            if not degrees or not isinstance(degrees, list):
                return 0
            
            total_score = 0
            target_lower = target_skill.lower()
            
            # Map skills to relevant fields
            skill_to_fields = {
                # Programming languages
                'python': ['computer science', 'software engineering', 'data science', 'computer engineering'],
                'java': ['computer science', 'software engineering', 'computer engineering'],
                'javascript': ['computer science', 'software engineering', 'web development'],
                'c++': ['computer science', 'computer engineering', 'software engineering'],
                'c#': ['computer science', 'software engineering'],
                'sql': ['computer science', 'database', 'information systems', 'data science'],
                'r': ['statistics', 'data science', 'mathematics', 'analytics'],
                # Frameworks
                'react': ['computer science', 'software engineering', 'web development'],
                'angular': ['computer science', 'software engineering', 'web development'],
                'django': ['computer science', 'software engineering', 'web development'],
                'spring': ['computer science', 'software engineering'],
                # Databases
                'mysql': ['computer science', 'database', 'information systems'],
                'postgresql': ['computer science', 'database', 'information systems'],
                'mongodb': ['computer science', 'database', 'information systems'],
                # Cloud
                'aws': ['computer science', 'cloud computing', 'information systems'],
                'azure': ['computer science', 'cloud computing', 'information systems'],
                'gcp': ['computer science', 'cloud computing', 'information systems'],
            }
            
            relevant_fields = skill_to_fields.get(target_lower, ['computer science', 'software engineering'])
            
            for degree in degrees:
                if isinstance(degree, dict):
                    field = degree.get("field", "").lower()
                    degree_name = degree.get("degree", "").lower()
                elif isinstance(degree, str):
                    field = degree.lower()
                    degree_name = degree.lower()
                else:
                    continue
                
                # Check if field is relevant
                if any(rel_field in field for rel_field in relevant_fields):
                    total_score += 10
                elif any(rel_field in degree_name for rel_field in relevant_fields):
                    total_score += 5
            
            return min(total_score, 10)  # Max 10 points total for education
            
        except Exception as e:
            logger.error(f"Error calculating education relevance score: {str(e)}")
            return 0

    def _is_meaningful_partial_match(self, target_skill: str, candidate_skill: str) -> bool:
        """Check if there's a meaningful partial match between skills, avoiding false positives"""
        # Avoid false matches like java/javascript, c/c++, etc.
        false_positive_pairs = {
            ('java', 'javascript'), ('javascript', 'java'),
            ('c', 'c++'), ('c++', 'c'),
            ('c', 'c#'), ('c#', 'c'),
            ('sql', 'nosql'), ('nosql', 'sql'),
            ('react', 'react native'), ('react native', 'react'),  # These are actually related, so we allow this
        }
        
        # Check if this is a known false positive pair
        if (target_skill, candidate_skill) in false_positive_pairs:
            return False
        
        # Allow meaningful partial matches:
        # 1. One skill contains the other and the shorter one is at least 3 characters
        # 2. The match makes semantic sense (not just substring)
        
        shorter = target_skill if len(target_skill) <= len(candidate_skill) else candidate_skill
        longer = candidate_skill if len(target_skill) <= len(candidate_skill) else target_skill
        
        # Must be at least 3 characters to avoid meaningless matches
        if len(shorter) < 3:
            return False
        
        # Check if shorter skill is contained in longer skill
        if shorter in longer:
            # Additional check: make sure it's a meaningful match
            # For example, "python" in "python3" is good, but "c" in "react" is bad
            
            # If the shorter skill is at word boundary or the difference is small, it's likely meaningful
            if longer.startswith(shorter) or longer.endswith(shorter):
                return True
            
            # If the skills are very similar in length, it's likely meaningful
            if len(longer) - len(shorter) <= 3:
                return True
        
        return False

    def _generate_search_response(self, query: str, candidates: List[Dict], filters: Dict) -> str:
        """Generate intelligent response for search queries"""
        try:
            candidate_count = len(candidates)
            
            if candidate_count == 0:
                return f"I couldn't find any candidates matching '{query}'. Try broadening your search criteria or check if you have candidates in your database."
            
            # Analyze the results
            top_skills = self._extract_top_skills(candidates[:5])
            avg_experience = self._calculate_average_experience(candidates[:5])
            
            response = f"I found {candidate_count} candidates matching '{query}'. "
            
            if candidate_count > 10:
                response += f"Here are the top 10 results. "
            
            response += f"The candidates have an average of {avg_experience:.1f} years of experience. "
            
            if top_skills:
                response += f"The most common skills among these candidates are: {', '.join(top_skills[:3])}. "
            
            if filters:
                applied_filters = []
                for k, v in filters.items():
                    if v is not None and v != "":
                        if isinstance(v, list) and len(v) > 0:
                            applied_filters.append(f"{k.replace('_', ' ')}: {', '.join(str(x) for x in v)}")
                        elif not isinstance(v, list):
                            applied_filters.append(f"{k.replace('_', ' ')}: {v}")
                
                if applied_filters:
                    response += f"I applied these filters: {', '.join(applied_filters)}. "
            
            response += "Would you like me to compare the top candidates or provide more details about any specific candidate?"
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating search response: {str(e)}")
            return f"I found {len(candidates)} candidates for your search query."

    def _generate_search_insights(self, candidates: List[Dict], filters: Dict) -> List[str]:
        """Generate insights about search results"""
        insights = []
        
        if not candidates:
            return ["No candidates found matching your criteria"]
        
        try:
            # Experience insights
            experiences = []
            for c in candidates:
                exp = c.get("parsed_data", {}).get("experience", {}).get("total_years", 0)
                if exp is not None and isinstance(exp, (int, float)) and exp >= 0:
                    experiences.append(exp)
            
            if experiences:
                avg_exp = sum(experiences) / len(experiences)
                insights.append(f"Average experience: {avg_exp:.1f} years")
                
                if avg_exp > 5:
                    insights.append("This is a senior candidate pool")
                elif avg_exp < 2:
                    insights.append("This is a junior candidate pool")
                else:
                    insights.append("This is a mid-level candidate pool")
            
            # Skills insights
            all_skills = []
            for candidate in candidates[:10]:
                skills = candidate.get("parsed_data", {}).get("skills", {})
                if isinstance(skills, dict):
                    prog_langs = skills.get("programming_languages", [])
                    if isinstance(prog_langs, list):
                        all_skills.extend([skill for skill in prog_langs if skill and isinstance(skill, str)])
                    
                    frameworks = skills.get("frameworks_libraries", [])
                    if isinstance(frameworks, list):
                        all_skills.extend([skill for skill in frameworks if skill and isinstance(skill, str)])
            
            if all_skills:
                from collections import Counter
                skill_counts = Counter(all_skills)
                top_skill = skill_counts.most_common(1)[0]
                insights.append(f"Most common skill: {top_skill[0]} ({top_skill[1]} candidates)")
            
            # Quality insights
            scores = []
            for c in candidates:
                score = c.get("ranking_score", {}).get("total_score", 0)
                if score is not None and isinstance(score, (int, float)):
                    scores.append(score)
            
            if scores:
                avg_score = sum(scores) / len(scores)
                insights.append(f"Average candidate quality score: {avg_score:.1f}/100")
                
                high_quality = len([s for s in scores if s > 80])
                if high_quality > 0:
                    insights.append(f"{high_quality} high-quality candidates (80+ score)")
            
        except Exception as e:
            logger.error(f"Error generating search insights: {str(e)}")
            insights.append("Analysis completed successfully")
        
        return insights

    def _generate_search_suggestions(self, query: str, candidates: List[Dict]) -> List[str]:
        """Generate suggestions to improve search results"""
        suggestions = []
        
        try:
            if len(candidates) == 0:
                suggestions = [
                    "Try using broader search terms",
                    "Check if you have uploaded resumes to the database",
                    "Consider searching for related skills or technologies"
                ]
            elif len(candidates) > 50:
                suggestions = [
                    "Add experience level filters to narrow results",
                    "Specify location preferences",
                    "Add specific skill requirements"
                ]
            else:
                suggestions = [
                    "Compare the top 3 candidates for detailed analysis",
                    "Filter by fraud risk level for safer hiring",
                    "Sort by overall score to see best matches first"
                ]
                
        except Exception as e:
            logger.error(f"Error generating search suggestions: {str(e)}")
            suggestions = ["Continue exploring candidates"]
        
        return suggestions

    def _generate_market_analysis(self, query: str, candidates: List[Dict]) -> Dict:
        """Generate market analysis based on query and available candidates"""
        try:
            analysis_data = {
                "total_candidates": len(candidates),
                "skill_distribution": {},
                "experience_distribution": {},
                "quality_metrics": {}
            }
            
            # Analyze skills
            all_skills = []
            for candidate in candidates:
                skills = candidate["parsed_data"].get("skills", {})
                if isinstance(skills, dict):
                    all_skills.extend(skills.get("programming_languages", []))
                    all_skills.extend(skills.get("frameworks_libraries", []))
            
            from collections import Counter
            skill_counts = Counter(all_skills)
            analysis_data["skill_distribution"] = dict(skill_counts.most_common(10))
            
            # Analyze experience
            experiences = [c["parsed_data"].get("experience", {}).get("total_years", 0) for c in candidates]
            exp_ranges = {"0-2 years": 0, "3-5 years": 0, "6-10 years": 0, "10+ years": 0}
            
            for exp in experiences:
                if exp <= 2:
                    exp_ranges["0-2 years"] += 1
                elif exp <= 5:
                    exp_ranges["3-5 years"] += 1
                elif exp <= 10:
                    exp_ranges["6-10 years"] += 1
                else:
                    exp_ranges["10+ years"] += 1
            
            analysis_data["experience_distribution"] = exp_ranges
            
            # Generate AI analysis
            prompt = f"""
            Analyze this candidate market data and provide insights:
            
            Query: "{query}"
            Market Data: {json.dumps(analysis_data, indent=2)}
            
            Provide analysis in JSON format:
            {{
                "analysis": "comprehensive market analysis text",
                "insights": ["key insight 1", "key insight 2"],
                "recommendations": ["recommendation 1", "recommendation 2"],
                "market_trends": ["trend 1", "trend 2"]
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a market analyst specializing in tech talent markets."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            result = response.choices[0].message.content.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            ai_analysis = json.loads(result)
            ai_analysis["market_data"] = analysis_data
            
            return ai_analysis
            
        except Exception as e:
            logger.error(f"Error generating market analysis: {str(e)}")
            return {
                "analysis": "Market analysis is currently unavailable",
                "insights": ["Analysis system is being updated"],
                "recommendations": ["Please try again later"],
                "market_data": {}
            }

    def _generate_general_response(self, query: str, query_analysis: Dict) -> str:
        """Generate helpful response for general queries"""
        try:
            intent = query_analysis.get("intent", "")
            
            if "help" in query.lower() or "how" in query.lower():
                return """I'm your AI recruitment assistant! I can help you:
                
• **Search for candidates**: "Find Python developers with 3+ years"
• **Compare candidates**: "Compare my top 3 candidates" 
• **Analyze markets**: "What skills are in demand?"
• **Get recommendations**: "Who should I hire for this role?"

Just ask me naturally, like you're talking to a colleague!"""
            
            elif "skills" in query.lower() or "demand" in query.lower():
                return "I can analyze skill trends in your candidate database. Try asking 'What are the most common skills?' or 'Analyze the Python developer market'."
            
            else:
                return f"I understand you're asking about: {intent}. I'm here to help with candidate search, comparison, and analysis. What specific information would you like to know?"
                
        except Exception as e:
            logger.error(f"Error generating general response: {str(e)}")
            return "I'm here to help with your recruitment needs. Try asking me to find candidates, compare them, or analyze market trends!"

    def _extract_top_skills(self, candidates: List[Dict]) -> List[str]:
        """Extract most common skills from candidates"""
        all_skills = []
        for candidate in candidates:
            skills = candidate.get("parsed_data", {}).get("skills", {})
            if isinstance(skills, dict):
                prog_langs = skills.get("programming_languages", [])
                if isinstance(prog_langs, list):
                    all_skills.extend([skill for skill in prog_langs if skill and isinstance(skill, str)])
                
                frameworks = skills.get("frameworks_libraries", [])
                if isinstance(frameworks, list):
                    all_skills.extend([skill for skill in frameworks if skill and isinstance(skill, str)])
        
        if not all_skills:
            return []
        
        from collections import Counter
        skill_counts = Counter(all_skills)
        return [skill for skill, count in skill_counts.most_common(5)]

    def _calculate_average_experience(self, candidates: List[Dict]) -> float:
        """Calculate average years of experience"""
        experiences = []
        for candidate in candidates:
            exp = candidate.get("parsed_data", {}).get("experience", {}).get("total_years", 0)
            if exp is not None and isinstance(exp, (int, float)) and exp > 0:
                experiences.append(exp)
        
        return sum(experiences) / len(experiences) if experiences else 0.0

    def _handle_comparison_query(self, user_message: str, query_analysis: Dict, db) -> Dict:
        """Handle comparison queries"""
        try:
            # Get all candidates for comparison
            all_candidates = db.search_candidates("", {})
            
            if not all_candidates:
                return {
                    "ai_response": "No candidates found in the database to compare.",
                    "candidates": [],
                    "comparison": {"error": "No candidates available"},
                    "query_type": "comparison",
                    "intent": query_analysis.get("intent", "comparison"),
                    "suggestions": ["Upload some resumes first to enable comparison"],
                    "follow_up_questions": ["Would you like to upload some resumes?"]
                }
            
            # Apply intelligent ranking to get skill relevance scores
            # Use a general query that will rank all candidates
            ranked_candidates = self._intelligent_skill_ranking(
                all_candidates, 
                "Compare all candidates", 
                {},  # No specific filters for general comparison
                use_ai_enhancement=False
            )
            
            # Take top candidates (limit to reasonable number for comparison)
            top_candidates = ranked_candidates[:5]  # Compare top 5 candidates
            
            # Generate intelligent comparison
            comparison_result = self.compare_candidates_intelligent(top_candidates, "overall")
            
            # Create lightweight summaries for frontend
            candidate_summaries = []
            for candidate in top_candidates:
                summary = self._create_lightweight_candidate_summary(candidate)
                candidate_summaries.append(summary)
            
            return {
                "ai_response": comparison_result.get("summary", "Comparison completed successfully."),
                "candidates": candidate_summaries,
                "comparison": comparison_result,
                "query_type": "comparison",
                "intent": query_analysis.get("intent", "comparison"),
                "insights": comparison_result.get("key_insights", []),
                "suggestions": [
                    "Consider the candidate with the best skill match",
                    "Look at experience levels and project complexity", 
                    "Evaluate cultural fit indicators"
                ],
                "follow_up_questions": [
                    "Which candidate would you like to know more about?",
                    "Should I compare them for a specific role?",
                    "Would you like interview questions for the top candidate?"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error handling comparison query: {str(e)}")
            return {
                "ai_response": f"Error occurred during comparison analysis: {str(e)}",
                "candidates": [],
                "comparison": {"error": str(e)},
                "query_type": "comparison",
                "intent": query_analysis.get("intent", "comparison"),
                "suggestions": ["Try again or contact support"],
                "follow_up_questions": ["Would you like to try a different search?"]
            }

    def _handle_analysis_query(self, user_message: str, query_analysis: Dict, db) -> Dict:
        """Handle analysis-type conversational queries"""
        try:
            # Generate analysis based on available candidates
            candidates = db.get_resumes()
            
            analysis_response = self._generate_market_analysis(user_message, candidates)
            
            return {
                "message": user_message,
                "query_type": "analysis",
                "intent": query_analysis.get("intent", ""),
                "ai_response": analysis_response.get("analysis", ""),
                "insights": analysis_response.get("insights", []),
                "market_data": analysis_response.get("market_data", {}),
                "recommendations": analysis_response.get("recommendations", []),
                "follow_up_questions": [
                    "Would you like to see candidates matching these criteria?",
                    "Should I analyze a specific skill set?",
                    "Do you want salary insights for this role?"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error handling analysis query: {str(e)}")
            return {"error": str(e)}

    def _handle_general_query(self, user_message: str, query_analysis: Dict, db) -> Dict:
        """Handle general conversational queries"""
        try:
            # Generate helpful response for general queries
            response = self._generate_general_response(user_message, query_analysis)
            
            return {
                "message": user_message,
                "query_type": "general",
                "intent": query_analysis.get("intent", ""),
                "ai_response": response,
                "suggestions": [
                    "Try asking: 'Find Python developers with 3+ years'",
                    "Or: 'Compare my top 3 candidates'",
                    "Or: 'What skills are most in demand?'"
                ],
                "follow_up_questions": [
                    "What type of role are you hiring for?",
                    "Do you have specific skill requirements?",
                    "Would you like to see all available candidates?"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error handling general query: {str(e)}")
            return {"error": str(e)}

    def compare_candidates_intelligent(self, candidates: List[Dict], criteria: str = "overall") -> Dict:
        """Generate intelligent candidate comparison with detailed analysis - OPTIMIZED for token efficiency"""
        try:
            # OPTIMIZATION 5: Create minimal candidate summaries instead of full data
            candidate_summaries = []
            for i, candidate in enumerate(candidates):
                # Use the new minimal summary function
                minimal_summary = self._create_minimal_candidate_summary(candidate)
                candidate_summaries.append(minimal_summary)
            
            # Try AI comparison first, but with much less data
            try:
                # OPTIMIZATION 6: Much shorter, focused prompt
                prompt = f"""
                Compare these candidates for hiring. Focus on: {criteria}
                
                Candidates: {json.dumps(candidate_summaries)}
                
                Return JSON:
                {{
                    "summary": "Brief comparison and recommendation",
                    "ranking": [
                        {{
                            "rank": 1,
                            "candidate_name": "name",
                            "candidate_id": "id", 
                            "overall_score": 85,
                            "strengths": ["strength1", "strength2"],
                            "recommendation": "hire"
                        }}
                    ],
                    "key_insights": ["insight1", "insight2"],
                    "hiring_recommendation": {{
                        "top_choice": "candidate_name",
                        "reasoning": "brief explanation"
                    }}
                }}
                """
                
                response = self.client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a technical recruiter. Provide candidate comparison in valid JSON format only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    max_tokens=600  # Reduced from 1000
                )
                
                result = response.choices[0].message.content
                if not result or result.strip() == "":
                    raise ValueError("Empty response from AI")
                
                # Clean and parse JSON
                result = result.strip()
                if result.startswith('```json'):
                    result = result[7:]
                if result.endswith('```'):
                    result = result[:-3]
                result = result.strip()
                
                if not result:
                    raise ValueError("Empty result after cleaning")
                
                ai_comparison = json.loads(result)
                logger.info("OPTIMIZATION: AI comparison completed with minimal data")
                return ai_comparison
                
            except Exception as ai_error:
                logger.warning(f"AI comparison failed: {str(ai_error)}, using optimized fallback analysis")
                # Fall back to rule-based comparison
                return self._fallback_comparison_optimized(candidate_summaries, criteria)
            
        except Exception as e:
            logger.error(f"Error in intelligent candidate comparison: {str(e)}")
            # Emergency fallback
            return {
                "summary": f"Comparison analysis encountered an error. Using basic comparison.",
                "error": str(e),
                "ranking": [
                    {
                        "rank": i+1, 
                        "candidate_id": c.get("id", f"candidate_{i}"), 
                        "candidate_name": c.get("parsed_data", {}).get("personal_info", {}).get("full_name", f"Candidate {i+1}"),
                        "overall_score": c.get("ranking_score", {}).get("total_score", 0),
                        "strengths": ["Manual review required"],
                        "recommendation": "review"
                    } for i, c in enumerate(candidates)
                ],
                "key_insights": ["Detailed analysis unavailable due to technical error"],
                "hiring_recommendation": {
                    "top_choice": candidates[0].get("parsed_data", {}).get("personal_info", {}).get("full_name", "First candidate") if candidates else "None",
                    "reasoning": "Based on order provided - manual review recommended"
                }
            }
    
    def _fallback_comparison_optimized(self, candidate_summaries: List[Dict], criteria: str) -> Dict:
        """Optimized rule-based fallback comparison when AI fails"""
        try:
            # Sort candidates by different criteria using the minimal summary data
            if criteria.lower() in ["skills", "technical"]:
                sorted_candidates = sorted(candidate_summaries, key=lambda x: len(x.get("top_skills", [])), reverse=True)
            elif criteria.lower() in ["experience", "exp"]:
                sorted_candidates = sorted(candidate_summaries, key=lambda x: x.get("experience_years", 0), reverse=True)
            else:  # Overall
                sorted_candidates = sorted(candidate_summaries, key=lambda x: x.get("skill_relevance", x.get("score", 0)), reverse=True)
            
            # Generate ranking
            ranking = []
            for i, candidate in enumerate(sorted_candidates):
                # Determine strengths based on minimal data
                strengths = []
                if candidate.get("experience_years", 0) > 3:
                    strengths.append("Experienced professional")
                if len(candidate.get("top_skills", [])) > 3:
                    strengths.append("Diverse skill set")
                if candidate.get("score", 0) > 70:
                    strengths.append("High overall score")
                if candidate.get("skill_relevance", 0) > 50:
                    strengths.append("Strong skill match")
                
                # Determine recommendation
                score = candidate.get("skill_relevance", candidate.get("score", 0))
                if score > 70:
                    recommendation = "hire"
                elif score > 50:
                    recommendation = "interview"
                else:
                    recommendation = "pass"
                
                ranking.append({
                    "rank": i + 1,
                    "candidate_name": candidate.get("name", f"Candidate {i+1}"),
                    "candidate_id": candidate.get("id", f"candidate_{i}"),
                    "overall_score": score,
                    "strengths": strengths if strengths else ["Candidate submitted"],
                    "recommendation": recommendation
                })
            
            # Generate summary
            top_candidate = sorted_candidates[0] if sorted_candidates else None
            summary = f"Comparison completed using optimized analysis. "
            if top_candidate:
                score = top_candidate.get("skill_relevance", top_candidate.get("score", 0))
                summary += f"{top_candidate.get('name', 'Top candidate')} ranks highest with {score:.1f} points. "
            
            # Generate insights
            insights = []
            avg_score = sum(c.get("skill_relevance", c.get("score", 0)) for c in candidate_summaries) / len(candidate_summaries)
            insights.append(f"Average candidate score: {avg_score:.1f}")
            
            experienced_count = sum(1 for c in candidate_summaries if c.get("experience_years", 0) > 2)
            insights.append(f"{experienced_count} out of {len(candidate_summaries)} candidates have 3+ years experience")
            
            return {
                "summary": summary,
                "ranking": ranking,
                "key_insights": insights,
                "hiring_recommendation": {
                    "top_choice": top_candidate.get("name", "None") if top_candidate else "None",
                    "reasoning": f"Highest scoring candidate based on {criteria} criteria using optimized analysis"
                },
                "analysis_method": "optimized_fallback"
            }
            
        except Exception as e:
            logger.error(f"Error in optimized fallback comparison: {str(e)}")
            return {
                "summary": "Comparison analysis failed completely",
                "error": str(e),
                "ranking": [{"rank": i+1, "candidate_name": f"Candidate {i+1}", "recommendation": "manual_review"} for i in range(len(candidate_summaries))],
                "key_insights": ["Manual review required"],
                "hiring_recommendation": {"top_choice": "Manual review needed", "reasoning": "Analysis system unavailable"}
            }

    def _calculate_ai_enhanced_skill_score(self, candidate: Dict, target_skill: str) -> Dict:
        """Use AI to analyze skill depth and context for more sophisticated scoring"""
        try:
            parsed_data = candidate.get("parsed_data", {})
            
            # Prepare skill context for AI analysis
            skill_context = {
                "target_skill": target_skill,
                "candidate_skills": parsed_data.get("skills", {}),
                "work_experience": parsed_data.get("experience", {}),
                "projects": parsed_data.get("projects", []),
                "certifications": parsed_data.get("certifications", []),
                "education": parsed_data.get("education", {})
            }
            
            prompt = f"""
            Analyze this candidate's depth of experience with {target_skill}. Consider:
            1. How extensively they've used this skill in work/projects
            2. The complexity and scale of their {target_skill} projects
            3. Their progression and growth with this skill
            4. Relevant certifications or formal training
            5. Whether their education supports this skill
            
            Candidate Data:
            {json.dumps(skill_context, indent=2)[:1500]}
            
            Return JSON analysis:
            {{
                "skill_depth_score": 85,
                "confidence": 0.9,
                "analysis": {{
                    "skill_presence": "found|not_found",
                    "experience_depth": "beginner|intermediate|advanced|expert",
                    "professional_usage": "none|limited|moderate|extensive",
                    "project_complexity": "simple|moderate|complex|enterprise",
                    "learning_progression": "static|growing|advanced",
                    "formal_training": "none|some|certified|expert"
                }},
                "evidence": {{
                    "work_projects": ["list of relevant work experience"],
                    "personal_projects": ["list of relevant personal projects"],
                    "certifications": ["relevant certifications"],
                    "education_relevance": "how education supports this skill"
                }},
                "reasoning": "detailed explanation of the score"
            }}
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert technical recruiter analyzing candidate skill depth. Be precise and evidence-based."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=600
            )
            
            result = response.choices[0].message.content.strip()
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            return json.loads(result)
            
        except Exception as e:
            logger.error(f"Error in AI-enhanced skill analysis: {str(e)}")
            return {
                "skill_depth_score": 0,
                "confidence": 0.1,
                "analysis": {"error": str(e)},
                "evidence": {},
                "reasoning": "AI analysis failed"
            }

    def _calculate_hybrid_skill_score(self, candidate: Dict, target_skills: List[str], use_ai: bool = False) -> float:
        """
        Hybrid approach: Use enhanced algorithm by default, optionally enhance with AI for critical searches
        """
        # Always use the enhanced algorithm
        enhanced_score = self._calculate_skill_depth_score(candidate, target_skills)
        
        if not use_ai:
            return enhanced_score
        
        # For critical searches, enhance with AI analysis
        try:
            candidate_name = candidate.get("parsed_data", {}).get("personal_info", {}).get("full_name", "Unknown")
            ai_scores = []
            
            for target_skill in target_skills:
                ai_analysis = self._calculate_ai_enhanced_skill_score(candidate, target_skill)
                ai_score = ai_analysis.get("skill_depth_score", 0)
                confidence = ai_analysis.get("confidence", 0.5)
                
                # Weight AI score by confidence
                weighted_ai_score = ai_score * confidence
                ai_scores.append(weighted_ai_score)
                
                logger.info(f"DEBUG: {candidate_name} - AI analysis for {target_skill}: {ai_score} (confidence: {confidence:.2f})")
            
            avg_ai_score = sum(ai_scores) / len(ai_scores) if ai_scores else 0
            
            # Combine enhanced algorithm (70%) with AI analysis (30%)
            hybrid_score = (enhanced_score * 0.7) + (avg_ai_score * 0.3)
            
            logger.info(f"DEBUG: {candidate_name} - Hybrid score: {hybrid_score:.1f} (enhanced: {enhanced_score:.1f}, ai: {avg_ai_score:.1f})")
            
            return hybrid_score
            
        except Exception as e:
            logger.error(f"Error in hybrid skill scoring: {str(e)}")
            return enhanced_score  # Fallback to enhanced algorithm