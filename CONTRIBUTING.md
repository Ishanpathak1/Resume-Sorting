# Contributing to Resume-Sorting

Thank you for considering contributing to Resume-Sorting! 🎉

## How to Contribute

### 🐛 Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Ishanpathak1/Resume-Sorting/issues)
2. If not, create a new issue using the bug report template
3. Provide as much detail as possible, including:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots if applicable

### 💡 Suggesting Features

1. Check existing [Issues](https://github.com/Ishanpathak1/Resume-Sorting/issues) and [Pull Requests](https://github.com/Ishanpathak1/Resume-Sorting/pulls)
2. Create a new issue using the feature request template
3. Describe the feature and its benefits clearly

### 🛠️ Code Contributions

#### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/Resume-Sorting.git
   cd Resume-Sorting
   ```

2. **Set up the development environment**
   ```bash
   # Backend setup
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend setup
   cd ../app
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Guidelines

##### Frontend (React/TypeScript)
- Use TypeScript for all new components
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling
- Ensure responsive design
- Add proper error handling

##### Backend (Python/Flask)
- Follow PEP 8 style guidelines
- Add type hints where possible
- Include proper error handling
- Write docstrings for functions
- Add logging for debugging

##### Fraud Detection System
- Test thoroughly with various resume formats
- Document new detection methods
- Ensure performance doesn't degrade
- Add unit tests for new algorithms

#### Code Style

- **Python**: Follow PEP 8, use `black` for formatting
- **TypeScript/React**: Use ESLint and Prettier
- **Commit Messages**: Use conventional commits format
  ```
  feat: add new fraud detection algorithm
  fix: resolve PDF parsing issue
  docs: update API documentation
  style: format code with prettier
  ```

#### Testing

- Test your changes thoroughly
- Ensure existing functionality isn't broken
- Add unit tests for new features
- Test with various resume formats and edge cases

#### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update README.md** if adding new features
5. **Create a pull request** with:
   - Clear title and description
   - Reference related issues
   - Screenshots for UI changes
   - List of changes made

### 🧪 Testing

#### Backend Testing
```bash
cd backend
python -m pytest tests/
```

#### Frontend Testing
```bash
cd app
npm test
```

#### Manual Testing
- Test resume upload with various formats
- Verify fraud detection accuracy
- Check ranking algorithms
- Test responsive design

### 📝 Documentation

- Update README.md for new features
- Add inline comments for complex logic
- Update API documentation
- Create examples for new functionality

### 🎯 Priority Areas

We especially welcome contributions in:

1. **Fraud Detection Improvements**
   - New detection algorithms
   - Better accuracy and performance
   - Support for more file formats

2. **UI/UX Enhancements**
   - Better user experience
   - Accessibility improvements
   - Mobile optimization

3. **Performance Optimizations**
   - Faster processing
   - Reduced memory usage
   - Better caching strategies

4. **Integration Features**
   - API integrations
   - Export capabilities
   - Bulk processing

### 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the code of conduct

### 📞 Getting Help

- Create an issue for questions
- Join discussions in existing issues
- Reach out to maintainers if needed

### 🏆 Recognition

Contributors will be:
- Listed in the README.md
- Credited in release notes
- Invited to be maintainers for significant contributions

Thank you for making Resume-Sorting better! 🚀 