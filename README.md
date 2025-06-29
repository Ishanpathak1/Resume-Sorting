# 🎯 Resume-Sorting Application

An intelligent resume analysis and candidate ranking system with advanced fraud detection capabilities. This application helps HR professionals efficiently sort, analyze, and rank candidates while detecting sophisticated resume manipulation techniques.

## ✨ Key Features

### 🔍 **Advanced Fraud Detection System**
- **AI-Powered Analysis**: Detects ATS gaming techniques and resume manipulation
- **White Font Detection**: Identifies hidden text and invisible character manipulation  
- **Keyword Stuffing Detection**: Flags excessive keyword repetition patterns
- **PDF Content Stream Analysis**: Binary-level analysis for sophisticated fraud detection
- **Risk Scoring**: Comprehensive fraud risk assessment with actionable recommendations

### 📊 **Smart Candidate Ranking**
- **Multi-Factor Ranking**: Experience, skills, quality, and recency-based sorting
- **Smart Ranking Algorithms**: Intelligent composite scoring system
- **Visual Ranking Interface**: Easy-to-use ranking controls with position indicators
- **Flexible Sorting Options**: Both smart ranking and simple sorting modes

### 🤖 **AI-Enhanced Analysis**
- **Comprehensive Resume Parsing**: Extracts structured data from resumes
- **Skill Assessment**: Advanced skill matching and depth analysis
- **Interview Question Generation**: AI-generated relevant interview questions
- **Market Positioning**: Salary estimates and cultural fit indicators

### 💼 **Professional Dashboard**
- **Candidate Spreadsheet**: Interactive table with advanced filtering
- **Upload Management**: Drag-and-drop resume upload with progress tracking
- **Real-time Statistics**: Dashboard with candidate metrics and insights
- **Export Capabilities**: Download candidate data and analysis results

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Modern UI**: Clean, responsive interface built with React
- **TypeScript**: Type-safe development with enhanced IDE support
- **Component-Based**: Modular architecture for maintainability
- **Real-time Updates**: Live data synchronization

### Backend (Python Flask)
- **RESTful API**: Clean API design with comprehensive endpoints
- **AI Integration**: OpenAI GPT integration for intelligent analysis
- **PDF Processing**: Advanced PDF parsing with multiple libraries
- **SQLite Database**: Efficient local data storage

### Fraud Detection Engine
- **Multi-Vector Analysis**: 6 different fraud detection methods
- **Traditional + AI**: Combines rule-based and AI-powered detection
- **Configurable Thresholds**: Adjustable sensitivity settings
- **Detailed Reporting**: Comprehensive fraud analysis reports

## 🚀 Getting Started

### Prerequisites
- **Python 3.8+**
- **Node.js 16+**
- **OpenAI API Key**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Resume-Sorting.git
   cd Resume-Sorting
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   ```bash
   # Create .env file in backend directory
   echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
   ```

4. **Frontend Setup**
   ```bash
   cd ../app
   npm install
   ```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   python app.py
   ```
   Backend runs on `http://localhost:5000`

2. **Start Frontend Development Server**
   ```bash
   cd app
   npm start
   ```
   Frontend runs on `http://localhost:3000`

## 📋 Usage

### 1. **Upload Resumes**
- Drag and drop PDF resumes or click to browse
- Automatic parsing and analysis begins immediately
- Real-time progress tracking and status updates

### 2. **Smart Ranking**
- Use the **Smart Ranking** controls at the top of the candidate list
- Choose from ranking criteria:
  - 🏆 **Best Overall**: Comprehensive scoring algorithm
  - 👨‍💼 **Most Experienced**: Years of experience + project count
  - 🛠️ **Most Skilled**: Technical skills and certifications
  - ✅ **Highest Quality**: Base score with fraud risk penalty
  - 📅 **Most Recent**: Recently uploaded candidates first

### 3. **Fraud Detection**
- Automatic fraud analysis for all uploaded resumes
- Risk levels: **Low**, **Medium**, **High**
- Detailed fraud indicators and recommendations
- Manual review suggestions for suspicious resumes

### 4. **Candidate Analysis**
- Click on any candidate to view detailed analysis
- Comprehensive skill breakdown and experience summary
- AI-generated interview questions
- Market positioning and salary estimates

## 🔧 Configuration

### Fraud Detection Settings
The fraud detection system can be configured in `backend/fraud_detector.py`:

```python
# Adjust detection sensitivity
KEYWORD_STUFFING_THRESHOLD = 0.02  # 2% frequency threshold
WHITE_TEXT_THRESHOLD = 0.05        # 5% suspicious elements
TINY_FONT_SIZE = 3                 # Minimum font size in points
```

### AI Analysis Settings
Configure AI analysis in `backend/ai_analyzer.py`:

```python
MODEL = "gpt-3.5-turbo"           # AI model selection
MAX_TOKENS = 1800                 # Response length limit
TEMPERATURE = 0.1                 # Response consistency
```

## 🛡️ Fraud Detection Details

### Detection Methods

1. **White Text Analysis**
   - PDF color metadata analysis
   - Text positioning anomaly detection
   - Background/text color similarity checks
   - Tiny font detection (< 3pt)

2. **Keyword Stuffing Detection**
   - Repetition pattern analysis
   - Skill frequency analysis
   - Common ATS keyword identification

3. **PDF Content Stream Analysis**
   - Binary-level PDF analysis
   - White font command detection
   - Invisible text rendering modes
   - Off-page text positioning

4. **Content Authenticity**
   - Experience vs. skills ratio analysis
   - Readability scoring
   - Unrealistic claims detection

5. **Invisible Characters**
   - Zero-width character detection
   - Excessive whitespace patterns
   - Unicode manipulation detection

6. **Formatting Analysis**
   - Font size distribution analysis
   - Color usage patterns
   - Structural anomaly detection

## 📊 API Endpoints

### Resume Management
- `POST /api/upload-resume` - Upload and analyze resume
- `GET /api/resumes` - List all candidates
- `GET /api/resume/{id}` - Get specific candidate details
- `DELETE /api/resume/{id}` - Delete candidate

### Analysis & Search
- `POST /api/search` - Intelligent candidate search
- `GET /api/stats` - Application statistics
- `POST /api/compare` - Compare multiple candidates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT API integration
- **React Community** for excellent frontend framework
- **Flask Community** for lightweight backend framework
- **PDF Processing Libraries**: pdfplumber, PyPDF2, pymupdf

## 📞 Support

For support, email ishan.pathak2711@gmail.com or create an issue on GitHub.

---

**Built with ❤️ for better hiring processes** 
