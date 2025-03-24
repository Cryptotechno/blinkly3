document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const headlineElement = document.getElementById('headline');
    const descriptionElement = document.getElementById('description');

    generateBtn.addEventListener('click', async () => {
        const input = promptInput.value.trim();
        
        if (!input) {
            alert('Please enter a description');
            return;
        }

        // Disable the button and show loading state
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        resultSection.classList.remove('visible');

        try {
            const response = await fetch('/.netlify/functions/generateAd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate ad');
            }

            // Display the results
            headlineElement.textContent = data.headline;
            descriptionElement.textContent = data.description;
            resultSection.classList.add('visible');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            // Re-enable the button
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Ad';
        }
    });
}); 