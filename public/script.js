const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const generateButton = document.getElementById('generateButton');
const promptOutput = document.getElementById('promptOutput');
const previewImage = document.getElementById('previewImage');
const copyButton = document.getElementById('copyButton');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');

let uploadFile = null;

// File Handling Functions
function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
        uploadFile = file;
        fileNameDisplay.textContent = `File Selected: ${file.name}`;
        fileNameDisplay.classList.remove('hidden');

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.classList.remove('hidden');
            generateButton.disabled = false;
        };
        reader.readAsDataURL(file);

        errorMessage.classList.add('hidden');
        promptOutput.value = "";
        copyButton.classList.add('hidden');
    } else {
        alert("Please upload a valid image file.");
        resetState();
    }
}

function resetState() {
    uploadFile = null;
    fileNameDisplay.classList.add('hidden');
    previewImage.classList.add('hidden');
    previewImage.src = '#';
    generateButton.disabled = true;
    promptOutput.value = "";
    copyButton.classList.add('hidden');
}

//Event Listners for the file input and drag/drop
imageInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#4a90e2';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// API Interaction and Generation
generateButton.addEventListener('click', async () => {
    if(!uploadedFile) return;

    generateButton.disabled = true;
    loadingIndicator.classList.remove('hidden');
    promptOutput.value = "";
    copyButton.classList.add('hidden');
    errorMessage.classList.add('hidden');

    try {
        const base64Image = await convertFileToBase64(uploadedFile);
        const style = document.getElementById('promptStyle').value;

        // ** The request goes to the vercel serverless functions via the /generate-prompt route **
        const response =  await fetch('/generate-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                mimeType: uploadFile.type,
                style: style
            })
        });

        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        promptOutput.value = data.prompt.trim();
        copyButton.classList.remove('hidden');

    } catch (error) {
        console.error('Generation Error:', error);
        errorMessage.textContent = `Error: ${error.message}`;
        errorMessage.classList.remove('hidden');
        promptOutput.value = "Failed to generate prompt. See console for details.";
    } finally {
        generateButton.disabled = false;
        loadingIndicator.classList.add('hidden');
    }
});

// Utility Functions
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            //Extract the base64 string after the data URL header 
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function copyPrompt() {
    promptOutput.ariaSelected();
    promptOutput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(promptOutput.value);

    copyButton.textContent = 'Copied!';
    setTimeout(() => {
        copyButton.textContent = 'Copy Prompt';
    }, 2000);
}