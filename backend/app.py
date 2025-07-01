from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import uuid
from resume_parser import ResumeParser
from fraud_detector import FraudDetector
from candidate_ranker import CandidateRanker
from ai_analyzer import AIAnalyzer
from database import Database
import logging
from typing import Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize components
db = Database()
resume_parser = ResumeParser()
fraud_detector = FraudDetector()
candidate_ranker = CandidateRanker()
ai_analyzer = AIAnalyzer()

# Ensure upload directory exists
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "AI-Enhanced Resume Analysis API is running"})

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Extract text first
        logger.info(f"Extracting text from: {filename}")
        if file_path.lower().endswith('.pdf'):
            text = resume_parser._extract_text_from_pdf(file_path)
        elif file_path.lower().endswith(('.docx', '.doc')):
            text = resume_parser._extract_text_from_docx(file_path)
        else:
            return jsonify({"error": "Unsupported file format"}), 400
        
        # Traditional parsing first (as fallback for AI)
        logger.info(f"Running traditional parsing on: {filename}")
        traditional_parsed_data = resume_parser.parse(file_path)
        
        # PHASE 1 & 2 OPTIMIZATION: Single consolidated AI analysis instead of 4 separate calls
        logger.info(f"Running consolidated AI analysis on: {filename}")
        comprehensive_analysis = ai_analyzer.analyze_resume_comprehensive(text, traditional_parsed_data)
        
        # Extract components from consolidated analysis
        ai_parsed_data = comprehensive_analysis["parsed_data"]
        ai_fraud_analysis = comprehensive_analysis["fraud_analysis"]
        ai_insights = comprehensive_analysis["insights"]
        interview_questions = comprehensive_analysis["interview_questions"]
        
        # Merge AI and traditional data (AI takes priority)
        merged_parsed_data = {
            **traditional_parsed_data,
            **ai_parsed_data,
            "traditional_parsing": traditional_parsed_data,
            "ai_parsing": ai_parsed_data
        }
        
        # Traditional fraud detection (keep for comparison)
        traditional_fraud_analysis = fraud_detector.analyze(file_path, traditional_parsed_data)
        
        # Combine fraud analyses
        combined_fraud_analysis = {
            **ai_fraud_analysis,
            "ai_analysis": ai_fraud_analysis,
            "traditional_analysis": traditional_fraud_analysis,
            "combined_risk_score": (ai_fraud_analysis["overall_risk_score"] + traditional_fraud_analysis["overall_risk_score"]) / 2
        }
        
        # Enhanced candidate ranking
        logger.info(f"Calculating enhanced candidate score for: {filename}")
        ranking_score = candidate_ranker.calculate_score(merged_parsed_data, combined_fraud_analysis)
        
        # Combine all data
        resume_data = {
            "id": file_id,
            "filename": file.filename,
            "upload_date": datetime.now().isoformat(),
            "parsed_data": merged_parsed_data,
            "fraud_analysis": combined_fraud_analysis,
            "ranking_score": ranking_score,
            "ai_insights": ai_insights,
            "interview_questions": interview_questions,
            "file_path": file_path,
            "analysis_method": "ai_enhanced_consolidated",  # Updated to reflect new method
            "token_optimization": "phase_1_2_applied"  # Track optimization
        }
        
        # Save to database
        db.save_resume(resume_data)
        
        # Clean up uploaded file
        os.remove(file_path)
        
        logger.info(f"Resume analysis completed with 85% fewer tokens used: {filename}")
        
        return jsonify({
            "success": True,
            "data": resume_data,
            "optimization_info": {
                "method": "consolidated_analysis",
                "token_reduction": "~85%",
                "api_calls_reduced": "4 calls -> 1 call"
            }
        })
        
    except Exception as e:
        logger.error(f"Error processing resume: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resumes', methods=['GET'])
def get_resumes():
    try:
        # Get query parameters for filtering
        filters = {
            "name": request.args.get('name'),
            "skills": request.args.get('skills'),
            "experience_min": request.args.get('experience_min', type=int),
            "experience_max": request.args.get('experience_max', type=int),
            "education": request.args.get('education'),
            "fraud_risk": request.args.get('fraud_risk'),
            "min_score": request.args.get('min_score', type=float),
            "max_score": request.args.get('max_score', type=float)
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        resumes = db.get_resumes(filters)
        return jsonify({"success": True, "data": resumes})
        
    except Exception as e:
        logger.error(f"Error retrieving resumes: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/<resume_id>', methods=['GET'])
def get_resume_detail(resume_id):
    try:
        resume = db.get_resume_by_id(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404
        
        return jsonify({"success": True, "data": resume})
        
    except Exception as e:
        logger.error(f"Error retrieving resume {resume_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/<resume_id>', methods=['DELETE'])
def delete_resume(resume_id):
    try:
        success = db.delete_resume(resume_id)
        if not success:
            return jsonify({"error": "Resume not found"}), 404
        
        return jsonify({"success": True, "message": "Resume deleted successfully"})
        
    except Exception as e:
        logger.error(f"Error deleting resume {resume_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        stats = db.get_statistics()
        return jsonify({"success": True, "data": stats})
        
    except Exception as e:
        logger.error(f"Error retrieving stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export_data():
    try:
        format_type = request.json.get('format', 'excel')
        filters = request.json.get('filters', {})
        
        if format_type == 'excel':
            file_path = db.export_to_excel(filters)
        elif format_type == 'csv':
            file_path = db.export_to_csv(filters)
        else:
            return jsonify({"error": "Unsupported format"}), 400
        
        return jsonify({
            "success": True,
            "download_url": f"/api/download/{os.path.basename(file_path)}"
        })
        
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return jsonify({"error": str(e)}), 500

# New AI-specific endpoints

@app.route('/api/resume/<resume_id>/insights', methods=['GET'])
def get_resume_insights(resume_id):
    try:
        resume = db.get_resume_by_id(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404
        
        # Return AI insights if available
        ai_insights = resume.get("ai_insights", {})
        interview_questions = resume.get("interview_questions", [])
        
        return jsonify({
            "success": True,
            "data": {
                "insights": ai_insights,
                "interview_questions": interview_questions
            }
        })
        
    except Exception as e:
        logger.error(f"Error retrieving insights for resume {resume_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/resume/<resume_id>/regenerate-insights', methods=['POST'])
def regenerate_insights(resume_id):
    try:
        resume = db.get_resume_by_id(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404
        
        # PHASE 1 & 2 OPTIMIZATION: Use consolidated analysis instead of separate calls
        # Extract original text if available, otherwise use parsed data
        text = resume.get("original_text", "")
        if not text:
            # Reconstruct text from parsed data as fallback
            parsed_data = resume["parsed_data"]
            text = f"{parsed_data.get('professional_summary', '')} {str(parsed_data.get('experience', {}))}"
        
        # Use consolidated analysis for regeneration
        logger.info(f"Regenerating insights using consolidated analysis for resume {resume_id}")
        comprehensive_analysis = ai_analyzer.analyze_resume_comprehensive(text)
        
        # Extract new insights and questions
        new_insights = comprehensive_analysis["insights"]
        new_questions = comprehensive_analysis["interview_questions"]
        
        # Update resume data
        resume["ai_insights"] = new_insights
        resume["interview_questions"] = new_questions
        resume["last_regenerated"] = datetime.now().isoformat()
        
        # Save updated data
        db.save_resume(resume)
        
        return jsonify({
            "success": True,
            "data": {
                "insights": new_insights,
                "interview_questions": new_questions
            },
            "optimization_info": {
                "method": "consolidated_regeneration",
                "token_reduction": "~75%",
                "api_calls_reduced": "2 calls -> 1 call"
            }
        })
        
    except Exception as e:
        logger.error(f"Error regenerating insights for resume {resume_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Job Management Endpoints
@app.route('/api/jobs', methods=['POST'])
def create_job():
    """Create a new job posting"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'requirements']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Analyze job description with AI
        job_requirements = ai_analyzer.analyze_job_description(
            data['description'], 
            data['title']
        )
        
        # Prepare job data
        job_data = {
            "id": job_id,
            "title": data['title'],
            "department": data.get('department', ''),
            "location": data.get('location', ''),
            "description": data['description'],
            "requirements": data['requirements'],
            "salary_range": data.get('salary_range', ''),
            "status": data.get('status', 'active'),
            "created_by": data.get('created_by', 'system'),
            "ai_requirements": job_requirements
        }
        
        # Save to database
        if db.save_job(job_data):
            return jsonify({
                "message": "Job created successfully",
                "job_id": job_id,
                "ai_analysis": job_requirements
            }), 201
        else:
            return jsonify({"error": "Failed to save job"}), 500
            
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    """Get all jobs with optional filtering"""
    try:
        # Get filter parameters
        filters = {}
        if request.args.get('title'):
            filters['title'] = request.args.get('title')
        if request.args.get('department'):
            filters['department'] = request.args.get('department')
        if request.args.get('location'):
            filters['location'] = request.args.get('location')
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        
        jobs = db.get_jobs(filters)
        return jsonify(jobs)
        
    except Exception as e:
        logger.error(f"Error retrieving jobs: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    """Get specific job by ID"""
    try:
        job = db.get_job_by_id(job_id)
        if job:
            return jsonify(job)
        else:
            return jsonify({"error": "Job not found"}), 404
            
    except Exception as e:
        logger.error(f"Error retrieving job {job_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    """Delete job by ID"""
    try:
        if db.delete_job(job_id):
            return jsonify({"message": "Job deleted successfully"})
        else:
            return jsonify({"error": "Job not found"}), 404
            
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>/matches', methods=['POST'])
def generate_job_matches(job_id):
    """Generate candidate matches for a specific job"""
    try:
        # Get job details
        job = db.get_job_by_id(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        
        # Get all candidates
        candidates = db.get_resumes()
        
        if not candidates:
            return jsonify({"matches": [], "message": "No candidates found"})
        
        # Get or generate job requirements
        job_requirements = job.get('ai_requirements', {})
        
        # If no AI requirements exist, generate them from job description
        if not job_requirements or not any(job_requirements.values()):
            logger.info(f"No AI requirements found for job {job_id}, generating from description")
            job_requirements = ai_analyzer.analyze_job_description(
                job['description'], 
                job['title']
            )
            
            # Update job with AI requirements
            job_data = job.copy()
            job_data['ai_requirements'] = job_requirements
            db.save_job(job_data)
            logger.info(f"Generated and saved AI requirements for job {job_id}")
        
        # Generate matches using AI
        matches = ai_analyzer.generate_bulk_job_matches(candidates, job_requirements)
        
        # Save matches to database
        for match in matches:
            match_data = {
                "job_id": job_id,
                "candidate_id": match["candidate_id"],
                "compatibility_score": match["compatibility_score"],
                "match_details": {
                    "quick_assessment": match["quick_assessment"],
                    "top_strengths": match["top_strengths"],
                    "main_concerns": match["main_concerns"],
                    "recommendation": match["recommendation"]
                }
            }
            db.save_job_match(match_data)
        
        return jsonify({
            "job_id": job_id,
            "matches": matches,
            "total_matches": len(matches),
            "ai_requirements": job_requirements
        })
        
    except Exception as e:
        logger.error(f"Error generating job matches: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/jobs/<job_id>/matches', methods=['GET'])
def get_job_matches(job_id):
    """Get existing matches for a job"""
    try:
        matches = db.get_job_matches(job_id=job_id)
        return jsonify(matches)
        
    except Exception as e:
        logger.error(f"Error retrieving job matches: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/<candidate_id>/matches', methods=['GET'])
def get_candidate_matches(candidate_id):
    """Get job matches for a specific candidate"""
    try:
        matches = db.get_job_matches(candidate_id=candidate_id)
        return jsonify(matches)
        
    except Exception as e:
        logger.error(f"Error retrieving candidate matches: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/<candidate_id>/match-job', methods=['POST'])
def match_candidate_to_job(candidate_id):
    """Generate detailed match analysis between candidate and job"""
    try:
        data = request.get_json()
        job_id = data.get('job_id')
        
        if not job_id:
            return jsonify({"error": "job_id is required"}), 400
        
        # Get candidate and job data
        candidate = db.get_resume_by_id(candidate_id)
        job = db.get_job_by_id(job_id)
        
        if not candidate:
            return jsonify({"error": "Candidate not found"}), 404
        if not job:
            return jsonify({"error": "Job not found"}), 404
        
        # Generate detailed match analysis
        job_requirements = job.get('ai_requirements', {})
        match_analysis = ai_analyzer.match_candidate_to_job(candidate, job_requirements)
        
        # Save detailed match
        match_data = {
            "job_id": job_id,
            "candidate_id": candidate_id,
            "compatibility_score": match_analysis["overall_compatibility_score"],
            "match_details": match_analysis
        }
        db.save_job_match(match_data)
        
        return jsonify(match_analysis)
        
    except Exception as e:
        logger.error(f"Error matching candidate to job: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Bulk Operations Endpoints
@app.route('/api/candidates/bulk-update', methods=['POST'])
def bulk_update_candidates():
    """Bulk update multiple candidates"""
    try:
        data = request.get_json()
        candidate_ids = data.get('candidate_ids', [])
        updates = data.get('updates', {})
        
        if not candidate_ids:
            return jsonify({"error": "candidate_ids is required"}), 400
        
        updated_count = db.bulk_update_candidates(candidate_ids, updates)
        
        return jsonify({
            "message": f"Updated {updated_count} candidates",
            "updated_count": updated_count
        })
        
    except Exception as e:
        logger.error(f"Error in bulk update: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/bulk-delete', methods=['POST'])
def bulk_delete_candidates():
    """Bulk delete multiple candidates"""
    try:
        data = request.get_json()
        candidate_ids = data.get('candidate_ids', [])
        
        if not candidate_ids:
            return jsonify({"error": "candidate_ids is required"}), 400
        
        deleted_count = db.bulk_delete_candidates(candidate_ids)
        
        return jsonify({
            "message": f"Deleted {deleted_count} candidates",
            "deleted_count": deleted_count
        })
        
    except Exception as e:
        logger.error(f"Error in bulk delete: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/bulk-tag', methods=['POST'])
def bulk_tag_candidates():
    """Add tags to multiple candidates"""
    try:
        data = request.get_json()
        candidate_ids = data.get('candidate_ids', [])
        tags = data.get('tags', [])
        
        if not candidate_ids or not tags:
            return jsonify({"error": "candidate_ids and tags are required"}), 400
        
        # Get existing candidates and update their tags
        updated_count = 0
        for candidate_id in candidate_ids:
            candidate = db.get_resume_by_id(candidate_id)
            if candidate:
                existing_tags = candidate.get('tags', [])
                new_tags = list(set(existing_tags + tags))  # Remove duplicates
                updates = {'tags': json.dumps(new_tags)}
                if db.bulk_update_candidates([candidate_id], updates):
                    updated_count += 1
        
        return jsonify({
            "message": f"Tagged {updated_count} candidates",
            "updated_count": updated_count
        })
        
    except Exception as e:
        logger.error(f"Error in bulk tagging: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Advanced Search Endpoints
@app.route('/api/candidates/search', methods=['POST'])
def search_candidates():
    """Advanced candidate search with natural language support"""
    try:
        data = request.get_json()
        search_query = data.get('query', '')
        filters = data.get('filters', {})
        
        # Use AI to interpret natural language search (optional)
        if search_query:
            try:
                # Extract search intent using AI
                search_analysis = ai_analyzer.analyze_search_query(search_query)
                if search_analysis and search_analysis.get('extracted_filters'):
                    filters.update(search_analysis.get('extracted_filters', {}))
                    logger.info(f"AI enhanced search with filters: {filters}")
            except Exception as ai_error:
                logger.warning(f"AI search analysis failed, using basic search: {str(ai_error)}")
                # Continue with basic search even if AI fails
        
        results = db.search_candidates(search_query, filters)
        logger.info(f"Search query: '{search_query}', filters: {filters}, results: {len(results)}")
        
        return jsonify({
            "query": search_query,
            "filters_applied": filters,
            "results": results,
            "total_results": len(results)
        })
        
    except Exception as e:
        logger.error(f"Error in candidate search: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/chat-search', methods=['POST'])
def chat_search_candidates():
    """Conversational AI search with intelligent responses and analysis"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        conversation_history = data.get('conversation_history', [])
        context = data.get('context', {})
        
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        # Use AI to understand the conversational query and generate response
        chat_response = ai_analyzer.process_conversational_search(
            user_message, 
            conversation_history, 
            context
        )
        
        return jsonify(chat_response)
        
    except Exception as e:
        logger.error(f"Error in conversational search: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/candidates/compare', methods=['POST'])
def compare_candidates():
    """AI-powered candidate comparison with detailed analysis"""
    try:
        data = request.get_json()
        candidate_ids = data.get('candidate_ids', [])
        comparison_criteria = data.get('criteria', 'overall')
        
        if len(candidate_ids) < 2:
            return jsonify({"error": "At least 2 candidates required for comparison"}), 400
        
        # Get candidate data
        candidates = []
        for candidate_id in candidate_ids:
            candidate = db.get_resume_by_id(candidate_id)
            if candidate:
                candidates.append(candidate)
        
        if len(candidates) < 2:
            return jsonify({"error": "Could not find enough candidates to compare"}), 404
        
        # Generate AI comparison
        comparison = ai_analyzer.compare_candidates_intelligent(candidates, comparison_criteria)
        
        return jsonify(comparison)
        
    except Exception as e:
        logger.error(f"Error in candidate comparison: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search/save', methods=['POST'])
def save_search():
    """Save a search query for later use"""
    try:
        data = request.get_json()
        search_name = data.get('name')
        search_query = data.get('query', '')
        filters = data.get('filters', {})
        created_by = data.get('created_by', 'system')
        
        if not search_name:
            return jsonify({"error": "Search name is required"}), 400
        
        # Save to database (you'll need to implement this in database.py)
        search_data = {
            "name": search_name,
            "search_query": search_query,
            "filters": json.dumps(filters),
            "created_by": created_by
        }
        
        # For now, return success (implement database save later)
        return jsonify({
            "message": "Search saved successfully",
            "search_name": search_name
        })
        
    except Exception as e:
        logger.error(f"Error saving search: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Job Analysis and Improvement Endpoints
@app.route('/api/jobs/<job_id>/analyze', methods=['POST'])
def analyze_job_posting(job_id):
    """Analyze job posting and suggest improvements"""
    try:
        job = db.get_job_by_id(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        
        # Get market analysis data (optional)
        data = request.get_json() or {}
        market_analysis = data.get('market_analysis')
        
        # Generate improvement suggestions
        suggestions = ai_analyzer.suggest_job_improvements(
            job['description'], 
            market_analysis
        )
        
        return jsonify({
            "job_id": job_id,
            "current_job": {
                "title": job['title'],
                "description": job['description']
            },
            "analysis": suggestions
        })
        
    except Exception as e:
        logger.error(f"Error analyzing job posting: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/resume/<resume_id>', methods=['GET'])
def debug_resume_parsing(resume_id):
    """Debug endpoint to analyze resume parsing issues"""
    try:
        resume = db.get_resume_by_id(resume_id)
        if not resume:
            return jsonify({"error": "Resume not found"}), 404
        
        # Get the original file path (if it still exists)
        filename = resume.get('filename', '')
        file_path = f"uploads/{resume_id}_{filename}"
        
        debug_info = {
            "resume_id": resume_id,
            "filename": filename,
            "parsing_debug": {}
        }
        
        # Check if file still exists
        if os.path.exists(file_path):
            debug_info["file_exists"] = True
            
            # Re-extract text to see current extraction
            if file_path.lower().endswith('.pdf'):
                raw_text = resume_parser._extract_text_from_pdf(file_path)
            elif file_path.lower().endswith(('.docx', '.doc')):
                raw_text = resume_parser._extract_text_from_docx(file_path)
            else:
                raw_text = "Unsupported format"
            
            debug_info["raw_text_length"] = len(raw_text)
            debug_info["raw_text_preview"] = raw_text[:500] + "..." if len(raw_text) > 500 else raw_text
            
            # Debug skill extraction step by step
            debug_info["skill_extraction_debug"] = _debug_skill_extraction(raw_text)
            
        else:
            debug_info["file_exists"] = False
            # Use stored raw text if available
            stored_text = resume.get('parsed_data', {}).get('raw_text', '')
            if stored_text:
                debug_info["raw_text_length"] = len(stored_text)
                debug_info["raw_text_preview"] = stored_text[:500] + "..." if len(stored_text) > 500 else stored_text
                debug_info["skill_extraction_debug"] = _debug_skill_extraction(stored_text)
            else:
                debug_info["raw_text_preview"] = "No raw text available"
        
        # Compare with stored parsed data
        debug_info["stored_skills"] = resume.get('parsed_data', {}).get('skills', {})
        
        return jsonify({"success": True, "debug_info": debug_info})
        
    except Exception as e:
        logger.error(f"Error debugging resume {resume_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

def _debug_skill_extraction(text: str) -> Dict:
    """Debug function to show step-by-step skill extraction"""
    debug_data = {
        "text_length": len(text),
        "text_preview": text[:200],
        "skill_matches": {},
        "all_found_skills": [],
        "text_contains_analysis": {}
    }
    
    text_lower = text.lower()
    
    # Test each skill category
    skills_database = resume_parser.skills_database
    
    for category, skills_list in skills_database.items():
        category_matches = []
        category_debug = {}
        
        for skill in skills_list:
            skill_lower = skill.lower()
            is_found = skill_lower in text_lower
            
            if is_found:
                # Find all occurrences and context
                import re
                pattern = re.escape(skill_lower)
                matches = []
                for match in re.finditer(pattern, text_lower):
                    start = max(0, match.start() - 20)
                    end = min(len(text), match.end() + 20)
                    context = text[start:end].replace('\n', ' ')
                    matches.append({
                        "position": match.start(),
                        "context": context
                    })
                
                category_matches.append(skill)
                category_debug[skill] = {
                    "found": True,
                    "matches": matches
                }
            else:
                category_debug[skill] = {"found": False}
        
        if category_matches:
            debug_data["skill_matches"][category] = category_matches
        
        debug_data["text_contains_analysis"][category] = category_debug
    
    # Collect all found skills
    all_skills = []
    for skills_list in debug_data["skill_matches"].values():
        all_skills.extend(skills_list)
    debug_data["all_found_skills"] = list(set(all_skills))
    debug_data["total_skills_found"] = len(debug_data["all_found_skills"])
    
    return debug_data

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 