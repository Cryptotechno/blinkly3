// Character limits for validation
const LIMITS = {
    headline: 30,
    description: 90,
    input: 500
};

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Show/hide sections
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
}

function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'none';
    }
}

// Copy text to clipboard
function copyText(event, targetId) {
    const btn = event.currentTarget;
    const element = document.getElementById(targetId);
    
    if (!element) return;
    
    const textToCopy = element.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.classList.add('copied');
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Copied!';
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('span').textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSection = document.getElementById('loadingSection');
    const resultSection = document.getElementById('resultSection');
    const charCount = document.querySelector('.char-count');
    const validationError = document.getElementById('validationError');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    const headlineElement = document.getElementById('headline');
    const descriptionElement = document.getElementById('description');
    const headlineCounter = document.querySelector('.headline-counter');
    const descriptionCounter = document.querySelector('.description-counter');
    const bannerSection = document.getElementById('bannerSection');
    const previewBannerBtn = document.getElementById('previewBannerBtn');
    const downloadBannerBtn = document.getElementById('downloadBannerBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const supportToggleBtn = document.getElementById('supportToggleBtn');
    const donationSection = document.getElementById('donationSection');
    
    // Initially check character count
    updateCharCount();
    
    function updateCharCount() {
        const currentLength = promptInput.value.length;
        charCount.textContent = `${currentLength}/${LIMITS.input}`;
        
        // Enable button only if input has content and is within limits
        if (currentLength > 0 && currentLength <= LIMITS.input) {
            generateBtn.disabled = false;
            charCount.classList.remove('warning');
        } else {
            generateBtn.disabled = true;
            if (currentLength > LIMITS.input) {
                charCount.classList.add('warning');
            } else {
                charCount.classList.remove('warning');
            }
        }
    }
    
    // Check character count as user types
    promptInput.addEventListener('input', debounce(updateCharCount, 100));
    
    // Generate button click handler
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        
        if (!prompt) return;
        if (prompt.length > LIMITS.input) {
            alert(`Input is too long. Maximum is ${LIMITS.input} characters.`);
            return;
        }
        
        // Hide results and validation error if shown
        hideSection('resultSection');
        validationError.style.display = 'none';
        
        // Show loading
        showSection('loadingSection');
        
        try {
            // Make API request
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            
            const data = await response.json();
            
            // Hide loading
            hideSection('loadingSection');
            
            // Process and display the result
            displayResult(data);
            
        } catch (error) {
            console.error('Error:', error);
            hideSection('loadingSection');
            
            // Show validation error as fallback
            validationError.style.display = 'flex';
            showSection('resultSection');
        }
    });
    
    // Function to display the API result
    function displayResult(data) {
        if (data.error) {
            validationError.style.display = 'flex';
            showSection('resultSection');
            return;
        }
        
        // Check for missing or invalid data
        if (!data.headline || !data.description || 
            typeof data.headline !== 'string' || 
            typeof data.description !== 'string') {
            
            validationError.style.display = 'flex';
            showSection('resultSection');
            return;
        }
        
        // Check character limits - show fallback if exceeded
        if (data.headline.length > LIMITS.headline || data.description.length > LIMITS.description) {
            validationError.style.display = 'flex';
            showSection('resultSection');
            return;
        }
        
        // Display content and update counters
        headlineElement.textContent = data.headline;
        descriptionElement.textContent = data.description;
        
        headlineCounter.textContent = `${data.headline.length}/${LIMITS.headline}`;
        descriptionCounter.textContent = `${data.description.length}/${LIMITS.description}`;
        
        // Apply counter classes based on character count
        updateCounterClass(headlineCounter, data.headline.length, LIMITS.headline);
        updateCounterClass(descriptionCounter, data.description.length, LIMITS.description);
        
        // Hide validation error, show result section
        validationError.style.display = 'none';
        showSection('resultSection');
        
        // Draw the banner preview
        drawBanner(data.headline, data.description);
    }
    
    function updateCounterClass(counterElement, currentLength, maxLength) {
        const warningThreshold = maxLength * 0.9; // 90% of max
        
        counterElement.classList.remove('warning', 'error');
        
        if (currentLength > maxLength) {
            counterElement.classList.add('error');
        } else if (currentLength > warningThreshold) {
            counterElement.classList.add('warning');
        }
    }
    
    // Try again button
    tryAgainBtn.addEventListener('click', () => {
        hideSection('resultSection');
        validationError.style.display = 'none';
        promptInput.focus();
    });
    
    // Banner preview button
    previewBannerBtn.addEventListener('click', () => {
        if (bannerSection.style.display === 'block') {
            hideSection('bannerSection');
            previewBannerBtn.innerHTML = '<i class="fas fa-image"></i> Show Banner Preview';
        } else {
            showSection('bannerSection');
            previewBannerBtn.innerHTML = '<i class="fas fa-times"></i> Hide Banner Preview';
        }
    });
    
    // Support button
    supportToggleBtn.addEventListener('click', () => {
        if (donationSection.style.display === 'block') {
            hideSection('donationSection');
            supportToggleBtn.innerHTML = '<i class="fas fa-heart"></i> Support this project';
        } else {
            showSection('donationSection');
            supportToggleBtn.innerHTML = '<i class="fas fa-times"></i> Hide support';
        }
    });
    
    // Dark/Light theme toggle for banner
    let isDarkTheme = true;
    
    darkThemeBtn.addEventListener('click', () => {
        isDarkTheme = true;
        darkThemeBtn.classList.add('active');
        lightThemeBtn.classList.remove('active');
        drawBanner(headlineElement.textContent, descriptionElement.textContent);
    });
    
    lightThemeBtn.addEventListener('click', () => {
        isDarkTheme = false;
        lightThemeBtn.classList.add('active');
        darkThemeBtn.classList.remove('active');
        drawBanner(headlineElement.textContent, descriptionElement.textContent);
    });
    
    // Draw the banner
    function drawBanner(headline, description) {
        const canvas = document.getElementById('adBannerCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set theme colors
        const bgColor = isDarkTheme ? '#1c1c28' : '#ffffff';
        const textColor = isDarkTheme ? '#ffffff' : '#1c1c28';
        const accentColor = '#0070f3';
        
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw accent line
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, 0, canvas.width, 4);
        
        // Set text styles for headline
        ctx.fillStyle = textColor;
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textBaseline = 'top';
        
        // Draw headline with word wrap
        const headlineY = wrapText(ctx, headline || 'Your Headline Here', 30, 40, canvas.width - 60, 30);
        
        // Set text styles for description
        ctx.font = '16px Inter, sans-serif';
        
        // Draw description with word wrap
        wrapText(ctx, description || 'Your description text here. This is where you would describe your product or service in more detail.', 30, headlineY + 30, canvas.width - 60, 24);
        
        // Draw logo or brand marker
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText('Blinkly Ad', canvas.width - 100, canvas.height - 30);
    }
    
    // Helper function to wrap text
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let testLine = '';
        let lineArray = [];
        
        for (let n = 0; n < words.length; n++) {
            testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                lineArray.push({ text: line, x, y });
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        lineArray.push({ text: line, x, y });
        
        for (let i = 0; i < lineArray.length; i++) {
            ctx.fillText(lineArray[i].text, lineArray[i].x, lineArray[i].y);
        }
        
        return y + lineHeight;
    }
    
    // Download banner functionality
    downloadBannerBtn.addEventListener('click', () => {
        const canvas = document.getElementById('adBannerCanvas');
        const link = document.createElement('a');
        
        link.download = 'blinkly-ad-banner.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}); 