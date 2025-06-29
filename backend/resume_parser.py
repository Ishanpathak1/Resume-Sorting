import PyPDF2
import docx
import re
import json
from typing import Dict, List, Optional
import spacy
import pandas as pd
from langdetect import detect
import pdfplumber
import logging

logger = logging.getLogger(__name__)

class ResumeParser:
    def __init__(self):
        try:
            # Load spaCy model for NLP
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        # Common patterns for extraction
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_pattern = re.compile(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}')
        self.experience_pattern = re.compile(r'(\d+)[\s+]?(years?|yrs?|year)', re.IGNORECASE)
        
        # Skills database (can be expanded)
        self.skills_database = self._load_skills_database()
        
        # Education keywords
        self.education_levels = [
            'phd', 'ph.d', 'doctorate', 'doctoral',
            'master', 'masters', 'mba', 'ms', 'ma', 'm.s', 'm.a',
            'bachelor', 'bachelors', 'bs', 'ba', 'b.s', 'b.a',
            'associate', 'diploma', 'certificate'
        ]
    
    def _load_skills_database(self) -> Dict[str, List[str]]:
        """Load skills database organized by categories"""
        return {
            "programming_languages": [
                "python", "java", "javascript", "c++", "c#", "php", "ruby", "go", "rust",
                "swift", "kotlin", "typescript", "scala", "r", "matlab", "perl", "shell"
            ],
            "web_technologies": [
                "html", "css", "react", "angular", "vue", "node.js", "express", "django",
                "flask", "spring", "bootstrap", "jquery", "sass", "less", "webpack"
            ],
            "databases": [
                "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle", "sql server",
                "dynamodb", "cassandra", "elasticsearch", "neo4j"
            ],
            "cloud_platforms": [
                "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform",
                "ansible", "jenkins", "github actions", "gitlab ci"
            ],
            "data_science": [
                "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
                "pandas", "numpy", "matplotlib", "seaborn", "jupyter", "spark", "hadoop"
            ],
            "soft_skills": [
                "leadership", "communication", "teamwork", "problem solving", "analytical",
                "project management", "agile", "scrum", "time management", "adaptability"
            ]
        }
    
    def parse(self, file_path: str) -> Dict:
        """Main parsing function"""
        try:
            # Extract text based on file type
            if file_path.lower().endswith('.pdf'):
                text = self._extract_text_from_pdf(file_path)
            elif file_path.lower().endswith(('.docx', '.doc')):
                text = self._extract_text_from_docx(file_path)
            else:
                raise ValueError("Unsupported file format. Only PDF and DOCX are supported.")
            
            # Parse structured data
            parsed_data = {
                "raw_text": text,
                "personal_info": self._extract_personal_info(text),
                "contact_info": self._extract_contact_info(text),
                "skills": self._extract_skills(text),
                "experience": self._extract_experience(text),
                "education": self._extract_education(text),
                "certifications": self._extract_certifications(text),
                "summary": self._extract_summary(text),
                "metadata": {
                    "text_length": len(text),
                    "language": self._detect_language(text),
                    "parsing_timestamp": pd.Timestamp.now().isoformat()
                }
            }
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"Error parsing resume: {str(e)}")
            raise
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF with multiple methods for better coverage"""
        text = ""
        
        try:
            # Method 1: pdfplumber (better for complex layouts)
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            # If pdfplumber fails, try PyPDF2
            if not text.strip():
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                        
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            
        return text.strip()
    
    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from DOCX: {str(e)}")
            return ""
    
    def _extract_personal_info(self, text: str) -> Dict:
        """Extract personal information like name"""
        info = {}
        
        if self.nlp:
            doc = self.nlp(text[:1000])  # Process first 1000 chars for efficiency
            
            # Extract person names
            names = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
            if names:
                full_name = names[0]  # Take the first name found
                name_parts = full_name.split()
                info["full_name"] = full_name
                info["first_name"] = name_parts[0] if name_parts else ""
                info["last_name"] = name_parts[-1] if len(name_parts) > 1 else ""
        
        return info
    
    def _extract_contact_info(self, text: str) -> Dict:
        """Extract contact information"""
        contact_info = {}
        
        # Extract email
        emails = self.email_pattern.findall(text)
        if emails:
            contact_info["email"] = emails[0]
        
        # Extract phone
        phones = self.phone_pattern.findall(text)
        if phones:
            contact_info["phone"] = phones[0]
        
        # Extract LinkedIn (simple pattern)
        linkedin_pattern = re.compile(r'linkedin\.com/in/[\w-]+', re.IGNORECASE)
        linkedin_matches = linkedin_pattern.findall(text)
        if linkedin_matches:
            contact_info["linkedin"] = "https://" + linkedin_matches[0]
        
        return contact_info
    
    def _extract_skills(self, text: str) -> Dict:
        """Extract skills categorized by type"""
        text_lower = text.lower()
        found_skills = {}
        
        for category, skills_list in self.skills_database.items():
            category_skills = []
            for skill in skills_list:
                if skill.lower() in text_lower:
                    category_skills.append(skill)
            
            if category_skills:
                found_skills[category] = category_skills
        
        # Extract all unique skills
        all_skills = []
        for skills_list in found_skills.values():
            all_skills.extend(skills_list)
        
        found_skills["all_skills"] = list(set(all_skills))
        found_skills["skills_count"] = len(all_skills)
        
        return found_skills
    
    def _extract_experience(self, text: str) -> Dict:
        """Extract work experience information"""
        experience = {}
        
        # Extract years of experience
        exp_matches = self.experience_pattern.findall(text)
        if exp_matches:
            years = [int(match[0]) for match in exp_matches]
            experience["years_experience"] = max(years) if years else 0
        else:
            experience["years_experience"] = 0
        
        # Simple job title extraction (can be improved with NLP)
        job_keywords = [
            "software engineer", "developer", "programmer", "analyst", "manager",
            "director", "consultant", "specialist", "coordinator", "assistant",
            "senior", "junior", "lead", "principal", "architect"
        ]
        
        found_titles = []
        text_lower = text.lower()
        for title in job_keywords:
            if title in text_lower:
                found_titles.append(title)
        
        experience["job_titles"] = found_titles
        
        return experience
    
    def _extract_education(self, text: str) -> Dict:
        """Extract education information"""
        education = {}
        text_lower = text.lower()
        
        # Find education levels
        found_levels = []
        for level in self.education_levels:
            if level in text_lower:
                found_levels.append(level)
        
        education["degrees"] = found_levels
        
        # Extract GPA (simple pattern)
        gpa_pattern = re.compile(r'gpa:?\s*(\d+\.?\d*)', re.IGNORECASE)
        gpa_matches = gpa_pattern.findall(text)
        if gpa_matches:
            try:
                education["gpa"] = float(gpa_matches[0])
            except ValueError:
                pass
        
        return education
    
    def _extract_certifications(self, text: str) -> List[str]:
        """Extract certifications"""
        cert_keywords = [
            "certification", "certified", "certificate", "license", "credential"
        ]
        
        certifications = []
        lines = text.split('\n')
        
        for line in lines:
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in cert_keywords):
                certifications.append(line.strip())
        
        return certifications[:10]  # Limit to first 10 found
    
    def _extract_summary(self, text: str) -> str:
        """Extract or generate a summary"""
        # Look for summary/objective sections
        summary_keywords = ["summary", "objective", "profile", "about"]
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            if any(keyword in line_lower for keyword in summary_keywords):
                # Get next few lines as summary
                summary_lines = lines[i:i+5]
                summary = ' '.join(summary_lines).strip()
                if len(summary) > 50:  # Ensure it's substantial
                    return summary[:500]  # Limit length
        
        # If no summary section found, return first paragraph
        paragraphs = text.split('\n\n')
        if paragraphs:
            return paragraphs[0][:300]
        
        return ""
    
    def _detect_language(self, text: str) -> str:
        """Detect the language of the resume"""
        try:
            return detect(text[:1000])
        except:
            return "unknown" 