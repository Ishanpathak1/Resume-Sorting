import sqlite3
import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "resumes.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize database tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS resumes (
                        id TEXT PRIMARY KEY,
                        filename TEXT NOT NULL,
                        upload_date TEXT NOT NULL,
                        parsed_data TEXT NOT NULL,
                        fraud_analysis TEXT NOT NULL,
                        ranking_score TEXT NOT NULL,
                        ai_insights TEXT,
                        interview_questions TEXT,
                        analysis_method TEXT DEFAULT 'traditional',
                        tags TEXT DEFAULT '[]',
                        comments TEXT DEFAULT '[]',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create jobs table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS jobs (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        department TEXT,
                        location TEXT,
                        description TEXT NOT NULL,
                        requirements TEXT NOT NULL,
                        salary_range TEXT,
                        status TEXT DEFAULT 'active',
                        created_by TEXT,
                        ai_requirements TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create job matches table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS job_matches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        job_id TEXT NOT NULL,
                        candidate_id TEXT NOT NULL,
                        compatibility_score REAL,
                        match_details TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (job_id) REFERENCES jobs(id),
                        FOREIGN KEY (candidate_id) REFERENCES resumes(id)
                    )
                """)
                
                # Create saved searches table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS saved_searches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        search_query TEXT,
                        filters TEXT,
                        created_by TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create indexes for better performance
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_upload_date ON resumes(upload_date)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_filename ON resumes(filename)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_job_status ON jobs(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_job_matches_job ON job_matches(job_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_job_matches_candidate ON job_matches(candidate_id)")
                
                # Migration: Add ai_requirements column to existing jobs table if it doesn't exist
                try:
                    cursor.execute("ALTER TABLE jobs ADD COLUMN ai_requirements TEXT")
                    logger.info("Added ai_requirements column to jobs table")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" in str(e).lower():
                        logger.info("ai_requirements column already exists")
                    else:
                        logger.warning(f"Error adding ai_requirements column: {str(e)}")
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    def save_resume(self, resume_data: Dict) -> bool:
        """Save resume data to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO resumes 
                    (id, filename, upload_date, parsed_data, fraud_analysis, ranking_score, ai_insights, interview_questions, analysis_method)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    resume_data["id"],
                    resume_data["filename"],
                    resume_data["upload_date"],
                    json.dumps(resume_data["parsed_data"]),
                    json.dumps(resume_data["fraud_analysis"]),
                    json.dumps(resume_data["ranking_score"]),
                    json.dumps(resume_data.get("ai_insights", {})),
                    json.dumps(resume_data.get("interview_questions", [])),
                    resume_data.get("analysis_method", "traditional")
                ))
                
                conn.commit()
                logger.info(f"Resume {resume_data['id']} saved successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error saving resume: {str(e)}")
            return False
    
    def get_resumes(self, filters: Dict = None) -> List[Dict]:
        """Get resumes with optional filtering"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM resumes"
                params = []
                
                if filters:
                    conditions = []
                    
                    if filters.get("name"):
                        conditions.append("parsed_data LIKE ?")
                        params.append(f"%{filters['name']}%")
                    
                    if filters.get("skills"):
                        conditions.append("parsed_data LIKE ?")
                        params.append(f"%{filters['skills']}%")
                    
                    if conditions:
                        query += " WHERE " + " AND ".join(conditions)
                
                query += " ORDER BY upload_date DESC"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                resumes = []
                for row in rows:
                    resume = {
                        "id": row[0],
                        "filename": row[1],
                        "upload_date": row[2],
                        "parsed_data": self._safe_json_loads(row[3], {}),
                        "fraud_analysis": self._safe_json_loads(row[4], {}),
                        "ranking_score": self._safe_json_loads(row[5], {}),
                        "ai_insights": self._safe_json_loads(row[6], {}) if row[6] else {},
                        "interview_questions": self._safe_json_loads(row[7], []) if row[7] else [],
                        "analysis_method": row[8] if len(row) > 8 else "traditional",
                        "created_at": row[9] if len(row) > 9 else row[6]
                    }
                    
                    # Apply additional filters
                    if self._matches_filters(resume, filters):
                        resumes.append(resume)
                
                return resumes
                
        except Exception as e:
            logger.error(f"Error retrieving resumes: {str(e)}")
            return []
    
    def get_resume_by_id(self, resume_id: str) -> Optional[Dict]:
        """Get a specific resume by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT * FROM resumes WHERE id = ?", (resume_id,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        "id": row[0],
                        "filename": row[1],
                        "upload_date": row[2],
                        "parsed_data": self._safe_json_loads(row[3], {}),
                        "fraud_analysis": self._safe_json_loads(row[4], {}),
                        "ranking_score": self._safe_json_loads(row[5], {}),
                        "ai_insights": self._safe_json_loads(row[6], {}) if row[6] else {},
                        "interview_questions": self._safe_json_loads(row[7], []) if row[7] else [],
                        "analysis_method": row[8] if len(row) > 8 else "traditional",
                        "created_at": row[9] if len(row) > 9 else row[6]
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving resume {resume_id}: {str(e)}")
            return None
    
    def delete_resume(self, resume_id: str) -> bool:
        """Delete a resume by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("DELETE FROM resumes WHERE id = ?", (resume_id,))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Resume {resume_id} deleted successfully")
                    return True
                else:
                    return False
                    
        except Exception as e:
            logger.error(f"Error deleting resume {resume_id}: {str(e)}")
            return False
    
    def get_statistics(self) -> Dict:
        """Get database statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Total count
                cursor.execute("SELECT COUNT(*) FROM resumes")
                total_count = cursor.fetchone()[0]
                
                # Get all resumes for analysis
                cursor.execute("SELECT parsed_data, fraud_analysis, ranking_score FROM resumes")
                rows = cursor.fetchall()
                
                stats = {
                    "total_resumes": total_count,
                    "fraud_statistics": {"low": 0, "medium": 0, "high": 0},
                    "score_distribution": {
                        "excellent": 0, "good": 0, "average": 0, "poor": 0
                    },
                    "top_skills": {},
                    "education_levels": {}
                }
                
                scores = []
                for row in rows:
                    fraud_analysis = json.loads(row[1])
                    ranking_score = json.loads(row[2])
                    
                    # Fraud statistics
                    risk_level = fraud_analysis.get("risk_level", "low")
                    stats["fraud_statistics"][risk_level] += 1
                    
                    # Score distribution
                    total_score = ranking_score.get("total_score", 0)
                    scores.append(total_score)
                    
                    if total_score >= 80:
                        stats["score_distribution"]["excellent"] += 1
                    elif total_score >= 60:
                        stats["score_distribution"]["good"] += 1
                    elif total_score >= 40:
                        stats["score_distribution"]["average"] += 1
                    else:
                        stats["score_distribution"]["poor"] += 1
                
                stats["average_score"] = sum(scores) / len(scores) if scores else 0
                
                return stats
                
        except Exception as e:
            logger.error(f"Error getting statistics: {str(e)}")
            return {}
    
    def export_to_excel(self, filters: Dict = None) -> str:
        """Export resumes to Excel format"""
        try:
            resumes = self.get_resumes(filters)
            
            # Flatten data for export
            export_data = []
            for resume in resumes:
                parsed = resume["parsed_data"]
                fraud = resume["fraud_analysis"]
                score = resume["ranking_score"]
                
                export_data.append({
                    "ID": resume["id"],
                    "Filename": resume["filename"],
                    "Upload Date": resume["upload_date"],
                    "Analysis Method": resume.get("analysis_method", "traditional"),
                    "Full Name": parsed.get("personal_info", {}).get("full_name", ""),
                    "Email": parsed.get("contact_info", {}).get("email", ""),
                    "Phone": parsed.get("contact_info", {}).get("phone", ""),
                    "Location": parsed.get("contact_info", {}).get("location", ""),
                    "Total Score": score.get("total_score", 0),
                    "AI Overall Score": resume.get("ai_insights", {}).get("overall_score", ""),
                    "Skills Count": len(parsed.get("skills", {}).get("all_skills", [])),
                    "Experience Years": parsed.get("experience", {}).get("total_years", 0) or parsed.get("experience", {}).get("years_experience", 0),
                    "Education": ", ".join(parsed.get("education", {}).get("degrees", [])),
                    "Fraud Risk": fraud.get("risk_level", "unknown"),
                    "AI Authenticity Score": fraud.get("ai_analysis", {}).get("authenticity_score", ""),
                    "Recommendation": score.get("recommendation", ""),
                    "AI Hiring Decision": resume.get("ai_insights", {}).get("hiring_recommendation", {}).get("decision", ""),
                    "Strengths": "; ".join(resume.get("ai_insights", {}).get("strengths", [])),
                    "Weaknesses": "; ".join(resume.get("ai_insights", {}).get("weaknesses", [])),
                    "Interview Focus Areas": "; ".join(resume.get("ai_insights", {}).get("interview_focus_areas", []))
                })
            
            df = pd.DataFrame(export_data)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"resumes_export_{timestamp}.xlsx"
            filepath = os.path.join("exports", filename)
            
            os.makedirs("exports", exist_ok=True)
            df.to_excel(filepath, index=False)
            
            logger.info(f"Data exported to {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Error exporting to Excel: {str(e)}")
            raise
    
    def export_to_csv(self, filters: Dict = None) -> str:
        """Export resumes to CSV format"""
        try:
            # Similar to Excel export but save as CSV
            excel_path = self.export_to_excel(filters)
            csv_path = excel_path.replace('.xlsx', '.csv')
            
            df = pd.read_excel(excel_path)
            df.to_csv(csv_path, index=False)
            
            # Remove Excel file
            os.remove(excel_path)
            
            return csv_path
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            raise
    
    def _matches_filters(self, resume: Dict, filters: Dict) -> bool:
        """Check if resume matches additional filters"""
        if not filters:
            return True
        
        parsed = resume["parsed_data"]
        fraud = resume["fraud_analysis"]
        score = resume["ranking_score"]
        
        # Experience filters
        years = parsed.get("experience", {}).get("years_experience", 0)
        if filters.get("experience_min") and years < filters["experience_min"]:
            return False
        if filters.get("experience_max") and years > filters["experience_max"]:
            return False
        
        # Score filters
        total_score = score.get("total_score", 0)
        if filters.get("min_score") and total_score < filters["min_score"]:
            return False
        if filters.get("max_score") and total_score > filters["max_score"]:
            return False
        
        # Fraud risk filter
        if filters.get("fraud_risk"):
            risk_level = fraud.get("risk_level", "unknown")
            if risk_level != filters["fraud_risk"]:
                return False
        
        return True

    # Job Management Methods
    def save_job(self, job_data: Dict) -> bool:
        """Save job posting to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO jobs 
                    (id, title, department, location, description, requirements, salary_range, status, created_by, ai_requirements)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job_data["id"],
                    job_data["title"],
                    job_data["department"],
                    job_data["location"],
                    job_data["description"],
                    job_data["requirements"],
                    job_data["salary_range"],
                    job_data["status"],
                    job_data["created_by"],
                    json.dumps(job_data.get("ai_requirements", {}))
                ))
                
                conn.commit()
                logger.info(f"Job {job_data['id']} saved successfully")
                return True
                
        except Exception as e:
            logger.error(f"Error saving job: {str(e)}")
            return False
    
    def get_jobs(self, filters: Dict = None) -> List[Dict]:
        """Get all jobs with optional filtering"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM jobs"
                params = []
                conditions = []
                
                if filters:
                    if filters.get('title'):
                        conditions.append("title LIKE ?")
                        params.append(f"%{filters['title']}%")
                    if filters.get('department'):
                        conditions.append("department = ?")
                        params.append(filters['department'])
                    if filters.get('location'):
                        conditions.append("location LIKE ?")
                        params.append(f"%{filters['location']}%")
                    if filters.get('status'):
                        conditions.append("status = ?")
                        params.append(filters['status'])
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                query += " ORDER BY created_at DESC"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
            
            jobs = []
            for row in rows:
                job = {
                    "id": row[0],
                    "title": row[1],
                    "department": row[2],
                    "location": row[3],
                    "description": row[4],
                    "requirements": row[5],
                    "salary_range": row[6],
                    "status": row[7],
                    "created_by": row[8],
                    "ai_requirements": self._safe_json_loads(row[9], {}),
                    "created_at": row[10],
                    "updated_at": row[11]
                }
                jobs.append(job)
            
            return jobs
        except Exception as e:
            logger.error(f"Error retrieving jobs: {str(e)}")
            return []
    
    def get_job_by_id(self, job_id: str) -> Dict:
        """Get specific job by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        "id": row[0],
                        "title": row[1],
                        "department": row[2],
                        "location": row[3],
                        "description": row[4],
                        "requirements": row[5],
                        "salary_range": row[6],
                        "status": row[7],
                        "created_by": row[8],
                        "ai_requirements": self._safe_json_loads(row[9], {}),
                        "created_at": row[10],
                        "updated_at": row[11]
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving job {job_id}: {str(e)}")
            return None
    
    def delete_job(self, job_id: str) -> bool:
        """Delete job by ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    logger.info(f"Job {job_id} deleted successfully")
                    return True
                else:
                    return False
                    
        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {str(e)}")
            return False
    
    def save_job_match(self, match_data: Dict) -> bool:
        """Save job-candidate match result"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT OR REPLACE INTO job_matches 
                    (job_id, candidate_id, compatibility_score, match_details)
                    VALUES (?, ?, ?, ?)
                """, (
                    match_data["job_id"],
                    match_data["candidate_id"],
                    match_data["compatibility_score"],
                    json.dumps(match_data["match_details"])
                ))
                
                conn.commit()
                logger.info(f"Job match saved for job {match_data['job_id']} and candidate {match_data['candidate_id']}")
                return True
                
        except Exception as e:
            logger.error(f"Error saving job match: {str(e)}")
            return False
    
    def get_job_matches(self, job_id: str = None, candidate_id: str = None) -> List[Dict]:
        """Get job matches by job_id or candidate_id"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM job_matches"
                params = []
                conditions = []
                
                if job_id:
                    conditions.append("job_id = ?")
                    params.append(job_id)
                if candidate_id:
                    conditions.append("candidate_id = ?")
                    params.append(candidate_id)
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                query += " ORDER BY created_at DESC"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
            
            matches = []
            for row in rows:
                match = {
                    "id": row[0],
                    "job_id": row[1],
                    "candidate_id": row[2],
                    "compatibility_score": row[3],
                    "match_details": self._safe_json_loads(row[4], {}),
                    "created_at": row[5]
                }
                matches.append(match)
            
            return matches
        except Exception as e:
            logger.error(f"Error retrieving job matches: {str(e)}")
            return []

    # Bulk Operations Methods
    def bulk_update_candidates(self, candidate_ids: List[str], updates: Dict) -> int:
        """Bulk update multiple candidates"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE resumes SET 
                    parsed_data = ?,
                    fraud_analysis = ?,
                    ranking_score = ?,
                    ai_insights = ?,
                    interview_questions = ?,
                    analysis_method = ?,
                    tags = ?,
                    comments = ?
                    WHERE id IN ({})
                """.format(", ".join(["?"] * len(candidate_ids))),
                tuple(updates.values()) + tuple(candidate_ids))
                
                conn.commit()
                logger.info(f"Bulk updated {cursor.rowcount} candidates")
                return cursor.rowcount
                
        except Exception as e:
            logger.error(f"Error in bulk update: {str(e)}")
            return 0
    
    def bulk_delete_candidates(self, candidate_ids: List[str]) -> int:
        """Bulk delete multiple candidates"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("DELETE FROM resumes WHERE id IN ({})".format(", ".join(["?"] * len(candidate_ids))), tuple(candidate_ids))
                
                conn.commit()
                logger.info(f"Bulk deleted {cursor.rowcount} candidates")
                return cursor.rowcount
                
        except Exception as e:
            logger.error(f"Error in bulk delete: {str(e)}")
            return 0

    # Search and Filtering Methods
    def search_candidates(self, search_query: str, filters: Dict = None) -> List[Dict]:
        """Advanced candidate search with natural language support"""
        try:
            print(f"DEBUG: search_query='{search_query}', filters={filters}")
            
            # If no search query and no filters, return all resumes
            if not search_query and not filters:
                print("DEBUG: No search query and no filters, returning all resumes")
                return self.get_resumes()
            
            # Build SQLite query for complex search
            query = "SELECT * FROM resumes"
            params = []
            conditions = []
            
            # Improved text search - split query into keywords for better matching
            if search_query:
                # Split the search query into individual keywords
                keywords = [keyword.strip().lower() for keyword in search_query.split() if keyword.strip()]
                print(f"DEBUG: Split keywords: {keywords}")
                
                if keywords:
                    # Create search conditions for each keyword
                    keyword_conditions = []
                    for keyword in keywords:
                        search_term = f"%{keyword}%"
                        keyword_conditions.append("""(
                            LOWER(parsed_data) LIKE ? OR 
                            LOWER(filename) LIKE ? OR
                            LOWER(COALESCE(ai_insights, '')) LIKE ?
                        )""")
                        params.extend([search_term, search_term, search_term])
                    
                    # Use OR logic - any keyword found will match
                    conditions.append("(" + " OR ".join(keyword_conditions) + ")")
                    print(f"DEBUG: Added keyword search conditions for {len(keywords)} keywords using OR logic")
            
            # Apply WHERE clause if we have conditions
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            print(f"DEBUG: Final query: {query}")
            print(f"DEBUG: Query params: {params}")
            
            # Execute search
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                print(f"DEBUG: SQL returned {len(rows)} rows")
            
            resumes = []
            for i, row in enumerate(rows):
                try:
                    print(f"DEBUG: Processing row {i+1}/{len(rows)}")
                    resume = {
                        "id": row[0],
                        "filename": row[1],
                        "upload_date": row[2],
                        "parsed_data": self._safe_json_loads(row[3], {}),
                        "fraud_analysis": self._safe_json_loads(row[4], {}),
                        "ranking_score": self._safe_json_loads(row[5], {}),
                        "ai_insights": self._safe_json_loads(row[6], {}) if row[6] else {},
                        "interview_questions": self._safe_json_loads(row[7], []) if row[7] else [],
                        "analysis_method": row[8] if len(row) > 8 else "traditional",
                        "tags": self._safe_json_loads(row[9], []) if len(row) > 9 else [],
                        "comments": self._safe_json_loads(row[10], []) if len(row) > 10 else [],
                        "created_at": row[11] if len(row) > 11 else row[2]
                    }
                    
                    # Apply post-processing filters on parsed data
                    if self._matches_search_filters(resume, filters):
                        # Calculate relevance score for better ranking
                        relevance_score = self._calculate_relevance_score(resume, search_query, keywords if search_query else [])
                        resume['relevance_score'] = relevance_score
                        resumes.append(resume)
                        print(f"DEBUG: Added resume {resume['id']} to results (relevance: {relevance_score})")
                    else:
                        print(f"DEBUG: Resume {resume['id']} filtered out by post-processing")
                        
                except Exception as row_error:
                    print(f"DEBUG: Error processing row {i+1}: {str(row_error)}")
                    logger.error(f"Error processing resume row {i+1}: {str(row_error)}")
                    continue
            
            # Sort by relevance score (highest first)
            resumes.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
            
            print(f"DEBUG: Final results count: {len(resumes)}")
            return resumes
        except Exception as e:
            logger.error(f"Error in candidate search: {str(e)}")
            print(f"DEBUG: Exception in search: {str(e)}")
            return []
    
    def _safe_json_loads(self, json_str: str, default_value):
        """Safely parse JSON with fallback to default value"""
        try:
            if not json_str:
                return default_value
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse JSON: {str(e)[:100]}... Using default value.")
            return default_value
    
    def _matches_search_filters(self, resume: Dict, filters: Dict) -> bool:
        """Check if resume matches search filters (post-processing)"""
        if not filters:
            return True
        
        parsed = resume["parsed_data"]
        fraud = resume["fraud_analysis"]
        score = resume["ranking_score"]
        
        # Score filters
        if filters.get('min_score'):
            total_score = score.get("total_score", 0)
            if total_score < filters['min_score']:
                return False
        
        if filters.get('max_score'):
            total_score = score.get("total_score", 0)
            if total_score > filters['max_score']:
                return False
        
        # Experience filters
        if filters.get('min_experience'):
            years = parsed.get("experience", {}).get("total_years", 0) or parsed.get("experience", {}).get("years_experience", 0)
            if years < filters['min_experience']:
                return False
        
        if filters.get('max_experience'):
            years = parsed.get("experience", {}).get("total_years", 0) or parsed.get("experience", {}).get("years_experience", 0)
            if years > filters['max_experience']:
                return False
        
        # Skills filters
        if filters.get('programming_languages'):
            resume_languages = []
            skills = parsed.get("skills", {})
            if isinstance(skills, dict):
                resume_languages = skills.get("programming_languages", []) or skills.get("all_skills", [])
            
            required_languages = filters['programming_languages']
            if not any(lang.lower() in [rl.lower() for rl in resume_languages] for lang in required_languages):
                return False
        
        # Fraud risk filter
        if filters.get('fraud_risk'):
            risk_level = fraud.get("risk_level", "unknown")
            if risk_level != filters['fraud_risk']:
                return False
        
        return True

    def _calculate_relevance_score(self, resume: Dict, search_query: str, keywords: List[str]) -> float:
        """Calculate relevance score based on search query and keywords"""
        if not keywords:
            return 1.0
            
        relevance_score = 0.0
        parsed_data = resume.get("parsed_data", {})
        ai_insights = resume.get("ai_insights", {})
        filename = resume.get("filename", "").lower()
        
        # Convert all data to searchable text
        searchable_text = ""
        
        # Add personal info
        personal_info = parsed_data.get("personal_info", {})
        if personal_info:
            searchable_text += f" {personal_info.get('full_name', '')} {personal_info.get('email', '')}"
        
        # Add skills
        skills = parsed_data.get("skills", {})
        if skills:
            all_skills = []
            all_skills.extend(skills.get("programming_languages", []))
            all_skills.extend(skills.get("frameworks_libraries", []))
            all_skills.extend(skills.get("tools_technologies", []))
            all_skills.extend(skills.get("databases", []))
            searchable_text += f" {' '.join(all_skills)}"
        
        # Add experience info
        experience = parsed_data.get("experience", {})
        if experience:
            positions = experience.get("positions", [])
            for position in positions:
                if isinstance(position, dict):
                    searchable_text += f" {position.get('title', '')} {position.get('company', '')} {position.get('description', '')}"
        
        # Add education
        education = parsed_data.get("education", {})
        if education:
            searchable_text += f" {education.get('degree', '')} {education.get('field', '')} {education.get('institution', '')}"
        
        # Add AI insights
        if ai_insights:
            searchable_text += f" {' '.join(ai_insights.get('strengths', []))}"
            searchable_text += f" {' '.join(ai_insights.get('key_skills', []))}"
        
        # Add filename
        searchable_text += f" {filename}"
        
        # Convert to lowercase for case-insensitive matching
        searchable_text = searchable_text.lower()
        
        # Calculate score based on keyword matches
        for keyword in keywords:
            keyword_lower = keyword.lower()
            
            # Count occurrences of keyword in searchable text
            keyword_count = searchable_text.count(keyword_lower)
            
            # Base score for presence
            if keyword_count > 0:
                relevance_score += 1.0
                
                # Bonus for multiple occurrences
                relevance_score += (keyword_count - 1) * 0.2
                
                # Bonus for exact matches in important fields
                if keyword_lower in personal_info.get('full_name', '').lower():
                    relevance_score += 0.5
                
                if keyword_lower in filename:
                    relevance_score += 0.3
                
                # Check skills specifically
                for skill_list in [skills.get("programming_languages", []), 
                                 skills.get("frameworks_libraries", []),
                                 skills.get("tools_technologies", [])]:
                    for skill in skill_list:
                        if keyword_lower in skill.lower():
                            relevance_score += 0.4
                            break
        
        return relevance_score 