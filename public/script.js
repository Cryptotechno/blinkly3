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

// Copy text to clipboard with fallback
function copyText(event, targetId) {
    const btn = event.currentTarget;
    const element = document.getElementById(targetId);
    
    if (!element) return;
    
    const textToCopy = element.textContent;
    
    // Check if Clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopySuccess(btn);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            fallbackCopyText(textToCopy, btn);
        });
    } else {
        // Fallback for browsers without clipboard support or non-HTTPS
        fallbackCopyText(textToCopy, btn);
    }
}

// Fallback copy method using textarea
function fallbackCopyText(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
    
    if (success) {
        showCopySuccess(btn);
    }
}

// Show copy success feedback
function showCopySuccess(btn) {
    btn.classList.add('copied');
    const originalText = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = 'Copied!';
    
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = originalText;
    }, 2000);
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
    
    // Initialize visibility states based on DOM
    if (loadingSection) loadingSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';
    if (bannerSection) bannerSection.style.display = 'none';
    if (donationSection) donationSection.style.display = 'none';
    if (validationError) validationError.style.display = 'none';
    
    // Preload Inter font for canvas
    const fontLoader = new FontFace('Inter', 'url(https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2)');
    let fontLoaded = false;
    
    fontLoader.load().then(font => {
        document.fonts.add(font);
        fontLoaded = true;
        console.log('Inter font loaded successfully');
    }).catch(err => {
        console.warn('Failed to load Inter font:', err);
    });
    
    // Initially check character count
    updateCharCount();
    
    function updateCharCount() {
        const currentLength = promptInput.value.length;
        charCount.textContent = `${currentLength}/${LIMITS.input}`;
        
        // Enable button for any input with at least 1 character that doesn't exceed limits
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
    
    // Debug function to help with troubleshooting
    function logDebug(message, data) {
        console.log(`[DEBUG] ${message}`, data);
    }
    
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
        if (validationError) validationError.style.display = 'none';
        
        // Show loading and disable generate button to prevent multiple submissions
        showSection('loadingSection');
        generateBtn.disabled = true;
        
        try {
            logDebug('Starting API request with input:', prompt);
            
            // Make API request - use the correct Netlify function path
            const functionUrl = '/.netlify/functions/generateAd';
            logDebug('Calling API at:', functionUrl);
            
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({ input: prompt }),
            });
            
            // Check for HTTP errors
            if (!response.ok) {
                const errorText = await response.text();
                logDebug('API error response:', errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            logDebug('API response data:', data);
            
            // Hide loading
            hideSection('loadingSection');
            
            // Process and display the result
            displayResult(data);
            
        } catch (error) {
            console.error('Error:', error);
            logDebug('Caught error:', error.message);
            hideSection('loadingSection');
            
            // Try to generate fallback content for short inputs
            if (prompt.length < 5) {
                logDebug('Using client-side fallback for short input');
                const fallbackData = generateFallbackContent(prompt);
                displayResult(fallbackData);
            } else {
                // Show validation error as fallback for longer inputs
                if (validationError) {
                    validationError.style.display = 'flex';
                    showSection('resultSection');
                }
            }
        } finally {
            // Re-enable the generate button
            updateCharCount();
        }
    });
    
    // Generate fallback content for very short inputs
    function generateFallbackContent(prompt) {
        const cleanPrompt = prompt.trim();
        return {
            headline: `${cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1)}`,
            description: `Discover everything about ${cleanPrompt}. Learn more and explore the possibilities today.`
        };
    }
    
    // Function to display the API result
    function displayResult(data) {
        logDebug('Displaying result:', data);
        
        // If API returns an error but we have a short input, generate fallback content
        if (data.error && promptInput.value.trim().length < 5) {
            logDebug('Error in API response, using fallback');
            data = generateFallbackContent(promptInput.value.trim());
        }
        
        // Handle missing data by generating fallback content
        if (!data.headline || !data.description || 
            typeof data.headline !== 'string' || 
            typeof data.description !== 'string') {
            
            logDebug('Missing or invalid data in response');
            // Generate fallback content for short inputs
            if (promptInput.value.trim().length > 0) {
                data = generateFallbackContent(promptInput.value.trim());
            } else {
                if (validationError) validationError.style.display = 'flex';
                showSection('resultSection');
                return;
            }
        }
        
        // Ensure content fits within limits
        let headline = data.headline.trim();
        let description = data.description.trim();
        
        if (headline.length > LIMITS.headline) {
            headline = headline.substring(0, LIMITS.headline);
        }
        
        if (description.length > LIMITS.description) {
            description = description.substring(0, LIMITS.description);
        }
        
        logDebug('Final content:', { headline, description });
        
        // Display content and update counters
        headlineElement.textContent = headline;
        descriptionElement.textContent = description;
        
        headlineCounter.textContent = `${headline.length}/${LIMITS.headline}`;
        descriptionCounter.textContent = `${description.length}/${LIMITS.description}`;
        
        // Apply counter classes based on character count
        updateCounterClass(headlineCounter, headline.length, LIMITS.headline);
        updateCounterClass(descriptionCounter, description.length, LIMITS.description);
        
        // Hide validation error, show result section
        if (validationError) validationError.style.display = 'none';
        showSection('resultSection');
        
        // Draw the banner preview
        drawBanner(headline, description);
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
        if (validationError) validationError.style.display = 'none';
        promptInput.focus();
    });
    
    // Banner preview button
    previewBannerBtn.addEventListener('click', () => {
        if (bannerSection.style.display === 'block') {
            hideSection('bannerSection');
            const icon = '<i class="fas fa-image"></i>';
            previewBannerBtn.innerHTML = `${icon} Show Banner Preview`;
        } else {
            showSection('bannerSection');
            const icon = '<i class="fas fa-times"></i>';
            previewBannerBtn.innerHTML = `${icon} Hide Banner Preview`;
        }
    });
    
    // Support button
    supportToggleBtn.addEventListener('click', () => {
        if (donationSection.style.display === 'block') {
            hideSection('donationSection');
            const icon = '<i class="fas fa-heart"></i>';
            supportToggleBtn.innerHTML = `${icon} Support this project`;
        } else {
            showSection('donationSection');
            const icon = '<i class="fas fa-times"></i>';
            supportToggleBtn.innerHTML = `${icon} Hide support`;
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
        if (!canvas) return;
        
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
        
        // Set font family based on loading status
        const fontFamily = fontLoaded ? 'Inter, sans-serif' : 'Arial, sans-serif';
        
        // Set text styles for headline
        ctx.fillStyle = textColor;
        ctx.font = `bold 24px ${fontFamily}`;
        ctx.textBaseline = 'top';
        
        // Draw headline with word wrap
        const headlineY = wrapText(ctx, headline || 'Your Headline Here', 30, 40, canvas.width - 60, 30);
        
        // Set text styles for description
        ctx.font = `16px ${fontFamily}`;
        
        // Draw description with word wrap
        wrapText(ctx, description || 'Your description text here. This is where you would describe your product or service in more detail.', 30, headlineY + 30, canvas.width - 60, 24);
        
        // Draw logo or brand marker
        ctx.fillStyle = accentColor;
        ctx.font = `bold 14px ${fontFamily}`;
        ctx.fillText('Blinkly Ad', canvas.width - 100, canvas.height - 30);
    }
    
    // Helper function to wrap text
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        if (!text) return y;
        
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
        if (!canvas) return;
        
        let link;
        try {
            link = document.createElement('a');
            link.download = 'blinkly-ad-banner.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Error downloading banner:', e);
            alert('Unable to download banner. Your browser may not support this feature.');
        }
    });
}); 