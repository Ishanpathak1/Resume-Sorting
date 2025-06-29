import re
import pdfplumber
from PIL import Image
import numpy as np
from typing import Dict, List, Tuple
import logging
from collections import Counter
import textstat

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self):
        self.suspicious_patterns = {
            "keyword_stuffing": [
                r'(.{1,20})\1{3,}',  # Repeated patterns
                r'\b(\w+)\s+\1\s+\1\b',  # Triple word repetition
            ],
            "invisible_chars": [
                r'[\u200B-\u200D\u2060\uFEFF]',  # Zero-width characters
                r'[\u0020]{5,}',  # Excessive spaces
            ]
        }
        
        # Common skills that are often stuffed
        self.commonly_stuffed_skills = [
            "python", "java", "javascript", "react", "angular", "node.js",
            "aws", "docker", "kubernetes", "machine learning", "ai", "sql"
        ]
        
        # White font detection patterns
        self.white_font_patterns = [
            r'(?i)(?:color|fill)[:=]\s*(?:white|#fff|#ffffff|rgb\(255,255,255\))',
            r'(?i)font-color[:=]\s*(?:white|#fff|#ffffff)',
            r'(?i)text-color[:=]\s*(?:white|#fff|#ffffff)',
            r'(?i)style.*color:\s*(?:white|#fff|#ffffff)'
        ]
    
    def analyze(self, file_path: str, parsed_data: Dict) -> Dict:
        """Comprehensive fraud analysis"""
        try:
            analysis = {
                "overall_risk_score": 0.0,
                "risk_level": "low",
                "detected_issues": [],
                "detailed_analysis": {}
            }
            
            # Analyze different types of fraud
            white_text_analysis = self._detect_white_text(file_path)
            keyword_stuffing_analysis = self._detect_keyword_stuffing(parsed_data["raw_text"])
            invisible_chars_analysis = self._detect_invisible_characters(parsed_data["raw_text"])
            formatting_analysis = self._analyze_suspicious_formatting(file_path)
            content_analysis = self._analyze_content_authenticity(parsed_data)
            
            # ENHANCED: Add PDF content stream analysis
            pdf_stream_analysis = self._analyze_pdf_content_streams(file_path)
            
            # Combine analyses
            analysis["detailed_analysis"] = {
                "white_text": white_text_analysis,
                "keyword_stuffing": keyword_stuffing_analysis,
                "invisible_characters": invisible_chars_analysis,
                "suspicious_formatting": formatting_analysis,
                "content_authenticity": content_analysis,
                "pdf_stream_analysis": pdf_stream_analysis
            }
            
            # Calculate overall risk score
            risk_scores = [
                white_text_analysis["risk_score"],
                keyword_stuffing_analysis["risk_score"],
                invisible_chars_analysis["risk_score"],
                formatting_analysis["risk_score"],
                content_analysis["risk_score"],
                pdf_stream_analysis["risk_score"]
            ]
            
            analysis["overall_risk_score"] = sum(risk_scores) / len(risk_scores)
            
            # Determine risk level
            if analysis["overall_risk_score"] >= 0.7:
                analysis["risk_level"] = "high"
            elif analysis["overall_risk_score"] >= 0.4:
                analysis["risk_level"] = "medium"
            else:
                analysis["risk_level"] = "low"
            
            # Compile detected issues
            for category, details in analysis["detailed_analysis"].items():
                if details["detected"]:
                    analysis["detected_issues"].extend(details["issues"])
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in fraud analysis: {str(e)}")
            return {
                "overall_risk_score": 0.0,
                "risk_level": "unknown",
                "detected_issues": ["Analysis failed"],
                "detailed_analysis": {}
            }
    
    def _detect_white_text(self, file_path: str) -> Dict:
        """Detect white text on white background (invisible text) - ENHANCED"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            if file_path.lower().endswith('.pdf'):
                with pdfplumber.open(file_path) as pdf:
                    suspicious_elements = 0
                    total_elements = 0
                    white_text_indicators = []
                    
                    for page_num, page in enumerate(pdf.pages):
                        # Get page text with formatting
                        chars = page.chars
                        
                        # Check for color-based white text
                        for char in chars:
                            total_elements += 1
                            
                            # Check for white or very light text colors
                            if 'color' in char:
                                color = char.get('color', '#000000')
                                if self._is_light_color(color):
                                    suspicious_elements += 1
                                    white_text_indicators.append(f"Light color text: {color}")
                            
                            # Check for tiny font sizes (often used with white text)
                            if char.get('size', 12) < 2:
                                suspicious_elements += 1
                                white_text_indicators.append(f"Extremely small font: {char.get('size', 0)}")
                        
                        # ENHANCED: Check for text positioning anomalies
                        # Look for text that might be positioned outside visible area
                        page_bbox = page.bbox
                        for char in chars:
                            x0, y0 = char.get('x0', 0), char.get('y0', 0)
                            # Check if text is positioned outside normal page bounds
                            if (x0 < 0 or y0 < 0 or 
                                x0 > page_bbox[2] + 50 or y0 > page_bbox[3] + 50):
                                suspicious_elements += 1
                                white_text_indicators.append(f"Text positioned outside page bounds: ({x0}, {y0})")
                        
                        # ENHANCED: Check for overlapping text (layering technique)
                        char_positions = [(char.get('x0', 0), char.get('y0', 0), char.get('text', '')) for char in chars]
                        overlapping_count = 0
                        for i, (x1, y1, text1) in enumerate(char_positions):
                            for j, (x2, y2, text2) in enumerate(char_positions[i+1:], i+1):
                                # Check if characters are in very close proximity (potential overlap)
                                if abs(x1 - x2) < 1 and abs(y1 - y2) < 1 and text1 != text2:
                                    overlapping_count += 1
                        
                        if overlapping_count > 5:  # Threshold for suspicious overlapping
                            suspicious_elements += overlapping_count
                            white_text_indicators.append(f"Suspicious text overlapping detected: {overlapping_count} instances")
                        
                        # ENHANCED: Check for text with background color matching
                        # Look for text that might have background colors set to white
                        for char in chars:
                            if 'bgcolor' in char:
                                bgcolor = char.get('bgcolor')
                                textcolor = char.get('color', '#000000')
                                if bgcolor and self._colors_too_similar(bgcolor, textcolor):
                                    suspicious_elements += 1
                                    white_text_indicators.append(f"Text and background colors too similar: {textcolor} on {bgcolor}")
                    
                    # ENHANCED: Check for unusual text-to-visible-content ratio
                    if total_elements > 0:
                        white_text_ratio = suspicious_elements / total_elements
                        
                        # Lower threshold for detection (more sensitive)
                        if white_text_ratio > 0.05:  # More than 5% suspicious elements
                            analysis["detected"] = True
                            analysis["risk_score"] = min(white_text_ratio * 3, 1.0)  # Increased penalty
                            analysis["issues"].append(f"Potential white/hidden text detected ({white_text_ratio:.2%} of text)")
                        
                        # ENHANCED: Check for excessive tiny text even without color info
                        tiny_text_count = sum(1 for char in chars if char.get('size', 12) < 3)
                        tiny_text_ratio = tiny_text_count / total_elements if total_elements > 0 else 0
                        
                        if tiny_text_ratio > 0.1:  # More than 10% tiny text
                            analysis["detected"] = True
                            analysis["risk_score"] = max(analysis["risk_score"], min(tiny_text_ratio * 2, 1.0))
                            analysis["issues"].append(f"Excessive tiny text detected ({tiny_text_ratio:.2%} of text)")
                        
                        analysis["details"] = {
                            "suspicious_elements": suspicious_elements,
                            "total_elements": total_elements,
                            "white_text_ratio": white_text_ratio,
                            "tiny_text_ratio": tiny_text_ratio,
                            "white_text_indicators": white_text_indicators[:10],  # Limit to first 10 for readability
                            "total_indicators": len(white_text_indicators)
                        }
                        
        except Exception as e:
            logger.error(f"Error detecting white text: {str(e)}")
            
        return analysis
    
    def _detect_keyword_stuffing(self, text: str) -> Dict:
        """Detect excessive keyword repetition"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            words = re.findall(r'\b\w+\b', text.lower())
            word_count = Counter(words)
            
            # Check for commonly stuffed skills
            stuffed_skills = []
            total_words = len(words)
            
            for skill in self.commonly_stuffed_skills:
                skill_count = word_count.get(skill, 0)
                skill_frequency = skill_count / total_words if total_words > 0 else 0
                
                # Flag if a skill appears more than 2% of total words
                if skill_frequency > 0.02 and skill_count > 5:
                    stuffed_skills.append({
                        "skill": skill,
                        "count": skill_count,
                        "frequency": skill_frequency
                    })
            
            # Check for general repetition patterns
            repeated_patterns = []
            for pattern in self.suspicious_patterns["keyword_stuffing"]:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    repeated_patterns.extend(matches)
            
            # Calculate risk score
            stuffing_indicators = len(stuffed_skills) + len(repeated_patterns)
            analysis["risk_score"] = min(stuffing_indicators * 0.2, 1.0)
            
            if stuffed_skills or repeated_patterns:
                analysis["detected"] = True
                
                if stuffed_skills:
                    analysis["issues"].append(f"Potential keyword stuffing detected for {len(stuffed_skills)} skills")
                
                if repeated_patterns:
                    analysis["issues"].append(f"Suspicious repetition patterns found ({len(repeated_patterns)} instances)")
            
            analysis["details"] = {
                "stuffed_skills": stuffed_skills,
                "repeated_patterns": len(repeated_patterns),
                "total_words": total_words
            }
            
        except Exception as e:
            logger.error(f"Error detecting keyword stuffing: {str(e)}")
            
        return analysis
    
    def _detect_invisible_characters(self, text: str) -> Dict:
        """Detect invisible characters and excessive whitespace"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            invisible_chars = 0
            excessive_spaces = 0
            
            # Check for zero-width characters
            for pattern in self.suspicious_patterns["invisible_chars"]:
                matches = re.findall(pattern, text)
                if "zero-width" in pattern or "200" in pattern:
                    invisible_chars += len(matches)
                else:
                    excessive_spaces += len(matches)
            
            # Check for unusual character patterns
            unusual_chars = len(re.findall(r'[^\x00-\x7F\s]', text))
            
            total_indicators = invisible_chars + excessive_spaces
            
            if total_indicators > 0:
                analysis["detected"] = True
                analysis["risk_score"] = min(total_indicators * 0.1, 1.0)
                
                if invisible_chars > 0:
                    analysis["issues"].append(f"Invisible characters detected ({invisible_chars} instances)")
                
                if excessive_spaces > 10:
                    analysis["issues"].append(f"Excessive whitespace patterns ({excessive_spaces} instances)")
            
            analysis["details"] = {
                "invisible_chars": invisible_chars,
                "excessive_spaces": excessive_spaces,
                "unusual_chars": unusual_chars
            }
            
        except Exception as e:
            logger.error(f"Error detecting invisible characters: {str(e)}")
            
        return analysis
    
    def _analyze_suspicious_formatting(self, file_path: str) -> Dict:
        """Analyze formatting for suspicious patterns"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            if file_path.lower().endswith('.pdf'):
                with pdfplumber.open(file_path) as pdf:
                    font_sizes = []
                    text_colors = []
                    
                    for page in pdf.pages:
                        chars = page.chars
                        
                        for char in chars:
                            if char.get('size'):
                                font_sizes.append(char['size'])
                            
                            if char.get('color'):
                                text_colors.append(char['color'])
                    
                    # Analyze font size distribution
                    if font_sizes:
                        min_size = min(font_sizes)
                        size_variance = np.var(font_sizes) if len(font_sizes) > 1 else 0
                        
                        # Flag extremely small text
                        tiny_text_ratio = sum(1 for size in font_sizes if size < 3) / len(font_sizes)
                        
                        if tiny_text_ratio > 0.05:  # More than 5% tiny text
                            analysis["detected"] = True
                            analysis["risk_score"] += 0.3
                            analysis["issues"].append(f"Unusually small text detected ({tiny_text_ratio:.2%})")
                        
                        # Flag high variance in font sizes
                        if size_variance > 50:
                            analysis["detected"] = True
                            analysis["risk_score"] += 0.2
                            analysis["issues"].append("Highly variable font sizes detected")
                    
                    analysis["details"] = {
                        "font_sizes": {
                            "min": min(font_sizes) if font_sizes else 0,
                            "max": max(font_sizes) if font_sizes else 0,
                            "avg": np.mean(font_sizes) if font_sizes else 0,
                            "variance": np.var(font_sizes) if font_sizes else 0
                        },
                        "color_count": len(set(text_colors))
                    }
                    
        except Exception as e:
            logger.error(f"Error analyzing formatting: {str(e)}")
            
        return analysis
    
    def _analyze_content_authenticity(self, parsed_data: Dict) -> Dict:
        """Analyze content for authenticity indicators"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            text = parsed_data["raw_text"]
            
            # Check readability
            readability_score = textstat.flesch_reading_ease(text)
            
            # Check for unrealistic skill claims
            skills = parsed_data.get("skills", {}).get("all_skills", [])
            skill_count = len(skills)
            
            # Check experience vs. skills ratio
            experience_years = parsed_data.get("experience", {}).get("years_experience", 0)
            
            # Red flags
            red_flags = []
            
            # Too many skills for experience level
            if experience_years < 2 and skill_count > 20:
                red_flags.append("Excessive skills for experience level")
                analysis["risk_score"] += 0.3
            
            # Extremely low readability (might indicate generated text)
            if readability_score < 30:
                red_flags.append("Poor text readability")
                analysis["risk_score"] += 0.2
            
            # Missing contact information
            contact_info = parsed_data.get("contact_info", {})
            if not contact_info.get("email") and not contact_info.get("phone"):
                red_flags.append("Missing basic contact information")
                analysis["risk_score"] += 0.1
            
            # Unrealistic experience claims
            if experience_years > 50:
                red_flags.append("Unrealistic experience duration")
                analysis["risk_score"] += 0.4
            
            if red_flags:
                analysis["detected"] = True
                analysis["issues"] = red_flags
            
            analysis["details"] = {
                "readability_score": readability_score,
                "skill_count": skill_count,
                "experience_years": experience_years,
                "skill_to_experience_ratio": skill_count / max(experience_years, 1)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing content authenticity: {str(e)}")
            
        return analysis
    
    def _is_light_color(self, color: str) -> bool:
        """Check if a color is light (potentially invisible on white background)"""
        try:
            # Remove # if present
            color = color.lstrip('#')
            
            # Convert to RGB
            if len(color) == 6:
                r = int(color[0:2], 16)
                g = int(color[2:4], 16)
                b = int(color[4:6], 16)
                
                # Calculate luminance
                luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
                
                # Consider light if luminance > 0.9
                return luminance > 0.9
                
        except:
            pass
            
        return False
    
    def _colors_too_similar(self, color1: str, color2: str) -> bool:
        """Check if two colors are too similar (indicating potential hidden text)"""
        try:
            # Remove # if present
            color1 = color1.lstrip('#')
            color2 = color2.lstrip('#')
            
            # Convert to RGB
            if len(color1) == 6 and len(color2) == 6:
                r1, g1, b1 = int(color1[0:2], 16), int(color1[2:4], 16), int(color1[4:6], 16)
                r2, g2, b2 = int(color2[0:2], 16), int(color2[2:4], 16), int(color2[4:6], 16)
                
                # Calculate color difference using Euclidean distance
                color_diff = ((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)**0.5
                
                # Colors are too similar if difference is less than 30 (out of ~441 max)
                return color_diff < 30
                
        except:
            pass
            
        return False
    
    def _analyze_pdf_content_streams(self, file_path: str) -> Dict:
        """Analyze PDF content streams for white font manipulation and other tricks"""
        analysis = {
            "detected": False,
            "risk_score": 0.0,
            "issues": [],
            "details": {}
        }
        
        try:
            if not file_path.lower().endswith('.pdf'):
                return analysis
                
            import PyPDF2
            
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                white_font_indicators = []
                suspicious_patterns = 0
                total_content_streams = 0
                
                for page_num, page in enumerate(pdf_reader.pages):
                    if hasattr(page, 'get_contents') and page.get_contents():
                        total_content_streams += 1
                        content = page.get_contents()
                        
                        if hasattr(content, 'get_data'):
                            content_data = content.get_data().decode('latin-1', errors='ignore')
                        else:
                            content_data = str(content)
                        
                        # Check for white font patterns in PDF content streams
                        for pattern in self.white_font_patterns:
                            matches = re.findall(pattern, content_data)
                            if matches:
                                suspicious_patterns += len(matches)
                                white_font_indicators.append(f"White font pattern found: {matches[0]}")
                        
                        # Check for text rendering mode changes (often used to hide text)
                        rendering_mode_changes = re.findall(r'(\d+)\s+Tr', content_data)
                        invisible_rendering_modes = [mode for mode in rendering_mode_changes if int(mode) == 3]  # Mode 3 = invisible
                        
                        if invisible_rendering_modes:
                            suspicious_patterns += len(invisible_rendering_modes)
                            white_font_indicators.append(f"Invisible text rendering mode detected: {len(invisible_rendering_modes)} instances")
                        
                        # Check for color changes to white
                        white_color_commands = re.findall(r'(?:1\s+1\s+1\s+(?:rg|RG))|(?:1\s+g)|(?:1\s+G)', content_data)
                        if len(white_color_commands) > 5:  # More than 5 white color commands is suspicious
                            suspicious_patterns += 1
                            white_font_indicators.append(f"Excessive white color commands: {len(white_color_commands)}")
                        
                        # Check for text positioned outside page margins
                        text_positioning = re.findall(r'(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td', content_data)
                        off_page_text = [(x, y) for x, y in text_positioning if float(x) < 0 or float(y) < 0 or float(x) > 1000 or float(y) > 1000]
                        
                        if off_page_text:
                            suspicious_patterns += len(off_page_text)
                            white_font_indicators.append(f"Text positioned outside page: {len(off_page_text)} instances")
                
                # Calculate risk score
                if suspicious_patterns > 0:
                    analysis["detected"] = True
                    analysis["risk_score"] = min(suspicious_patterns * 0.2, 1.0)
                    analysis["issues"].append(f"PDF content stream manipulation detected ({suspicious_patterns} indicators)")
                
                analysis["details"] = {
                    "suspicious_patterns": suspicious_patterns,
                    "total_content_streams": total_content_streams,
                    "white_font_indicators": white_font_indicators[:5],  # Limit for readability
                    "total_indicators": len(white_font_indicators)
                }
                
        except Exception as e:
            logger.error(f"Error analyzing PDF content streams: {str(e)}")
            # Don't fail the entire analysis if PDF stream analysis fails
            analysis["details"]["error"] = str(e)
            
        return analysis 