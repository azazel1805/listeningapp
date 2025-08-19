document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const generateBtn = document.getElementById('generateBtn');
    const topicInput = document.getElementById('topicInput');
    const levelSelect = document.getElementById('levelSelect');
    const loadingDiv = document.getElementById('loading');
    const contentDiv = document.getElementById('content');
    const errorDiv = document.getElementById('error');
    
    // Audio Elements & State
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    // --- NEW/MODIFIED ELEMENTS ---
    const femaleVoiceBtn = document.getElementById('femaleVoiceBtn');
    const maleVoiceBtn = document.getElementById('maleVoiceBtn');
    const rateSlider = document.getElementById('rateSlider');
    const rateValueSpan = document.getElementById('rateValueSpan');
    let selectedGender = 'female'; // Default voice gender
    // --- END NEW/MODIFIED ---

    let synth = window.speechSynthesis;
    let utterance = new SpeechSynthesisUtterance();
    let voices = [];
    let currentWordSpan = null;

    // Tab Elements
    const tabs = document.querySelector('.tabs');
    const scriptDiv = document.getElementById('script');
    const quizDiv = document.getElementById('quiz');
    
    // Lookup Panel Elements
    const lookupPanel = document.getElementById('lookupPanel');
    const closePanelBtn = document.getElementById('closePanelBtn');
    const lookupContent = document.getElementById('lookupContent');
    const lookupLoading = document.getElementById('lookupLoading');

    // App State
    let fullContent = null;
    const UNSPLASH_KEY = "0uDnN1Zl1YFXRG3vHAKgEZoTakXkCg65RV3LtgXiNcM";

    // --- TTS, Highlighting, and Voice Logic ---
    function loadVoices() {
        voices = synth.getVoices().filter(voice => voice.lang.startsWith('en-US'));
    }

    loadVoices();
    if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = loadVoices;

    // --- NEW: Function to set the utterance voice based on selected gender ---
    function setUtteranceVoice() {
        const genderVoices = voices.filter(voice => voice.name.toLowerCase().includes(selectedGender));
        // Use a voice of the selected gender if available, otherwise fallback to the first US English voice
        utterance.voice = genderVoices.length > 0 ? genderVoices[0] : voices[0];
    }
    
    // --- NEW: Event listeners for voice and speed controls ---
    femaleVoiceBtn.addEventListener('click', () => {
        selectedGender = 'female';
        femaleVoiceBtn.classList.add('active');
        maleVoiceBtn.classList.remove('active');
    });

    maleVoiceBtn.addEventListener('click', () => {
        selectedGender = 'male';
        maleVoiceBtn.classList.add('active');
        femaleVoiceBtn.classList.remove('active');
    });
    
    rateSlider.addEventListener('input', () => {
        const rate = parseFloat(rateSlider.value);
        utterance.rate = rate;
        rateValueSpan.textContent = `${rate.toFixed(1)}x`;
        // If speaking, cancel and restart to apply the new rate immediately
        if (synth.speaking && !synth.paused) {
            synth.cancel();
            synth.speak(utterance);
        }
    });

    utterance.onboundary = (event) => {
        if (event.name !== 'word') return;
        const wordSpans = scriptDiv.querySelectorAll('.word');
        let charIndex = event.charIndex;
        let wordIndex = utterance.text.substring(0, charIndex).split(' ').length - 1;

        if (wordSpans[wordIndex]) {
            if (currentWordSpan) currentWordSpan.classList.remove('highlight-word');
            wordSpans[wordIndex].classList.add('highlight-word');
            currentWordSpan = wordSpans[wordIndex];
        }
    };
    
    utterance.onend = () => {
        if (currentWordSpan) currentWordSpan.classList.remove('highlight-word');
    };

    playBtn.addEventListener('click', () => {
        if (synth.paused) {
            synth.resume();
        } else {
            setUtteranceVoice(); // Set the correct voice before playing
            synth.speak(utterance);
        }
    });

    pauseBtn.addEventListener('click', () => synth.pause());
    stopBtn.addEventListener('click', () => {
        synth.cancel();
        if (currentWordSpan) currentWordSpan.classList.remove('highlight-word');
    });

    // --- Tab Functionality ---
    tabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tabId = e.target.getAttribute('data-tab');
            document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }
    });

    // --- Word Lookup Panel ---
    scriptDiv.addEventListener('dblclick', handleWordLookup);
    closePanelBtn.addEventListener('click', () => lookupPanel.classList.add('hidden'));

    async function handleWordLookup(event) {
        if (event.target.classList.contains('word')) {
            const word = event.target.textContent.trim().replace(/[.,!?]/g, '');
            if (!word) return;

            lookupPanel.classList.remove('hidden');
            lookupContent.innerHTML = '';
            lookupLoading.classList.remove('hidden');

            try {
                const [wordDetails, imageUrl] = await Promise.all([
                    fetchWordDetails(word),
                    getUnsplashImage(word)
                ]);
                lookupContent.innerHTML = `
                    <img src="${imageUrl}" alt="${wordDetails.word}">
                    <h3>${wordDetails.word}</h3>
                    <p><strong>Definition:</strong> ${wordDetails.definition}</p>
                    <p><strong>Synonyms:</strong> ${wordDetails.synonyms.join(', ') || 'N/A'}</p>
                    <p><strong>Antonyms:</strong> ${wordDetails.antonyms.join(', ') || 'N/A'}</p>
                    <p><strong>Turkish:</strong> ${wordDetails.turkish}</p>
                `;
            } catch (err) {
                lookupContent.innerHTML = `<p>Could not find details for "${word}".</p>`;
            } finally {
                lookupLoading.classList.add('hidden');
            }
        }
    }

    async function fetchWordDetails(word) {
        const response = await fetch('/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });
        if (!response.ok) throw new Error('Failed to fetch word details.');
        return response.json();
    }
    
    async function getUnsplashImage(query) {
        try {
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&client_id=${UNSPLASH_KEY}`);
            const data = await response.json();
            return data.results[0]?.urls?.small || 'https://via.placeholder.com/300x150';
        } catch (error) {
            return 'https://via.placeholder.com/300x150';
        }
    }
    
    // --- Main Content Generation ---
    generateBtn.addEventListener('click', async () => {
        const topic = topicInput.value.trim();
        if (!topic) { alert('Please enter a topic.'); return; }

        contentDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        lookupPanel.classList.add('hidden');
        loadingDiv.classList.remove('hidden');
        synth.cancel();

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topic, level: levelSelect.value })
            });
            if (!response.ok) throw new Error((await response.json()).error);
            fullContent = await response.json();
            renderContent(fullContent);
        } catch (err) {
            errorDiv.textContent = `Error: ${err.message}. Please try again.`;
            errorDiv.classList.remove('hidden');
        } finally {
            loadingDiv.classList.add('hidden');
        }
    });

    // --- Rendering Functions ---
    function renderContent(data) {
        scriptDiv.innerHTML = data.script.split(/(\s+)/).map(part => {
            return /\s+/.test(part) ? part : `<span class="word">${part}</span>`;
        }).join('');
        utterance.text = data.script;
        
        // Reset speed to default when new content is loaded
        rateSlider.value = 1;
        utterance.rate = 1;
        rateValueSpan.textContent = '1.0x';

        renderQuiz(data.quiz);

        contentDiv.classList.remove('hidden');
        document.querySelector('.tab-link[data-tab="script"]').click();
    }

    function renderQuiz(quiz) {
        quizDiv.innerHTML = '';
        quiz.forEach((q, index) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'quiz-question';
            questionEl.setAttribute('data-question-index', index);
            let optionsHtml = '<div class="quiz-options">';
            if (q.type === 'multiple-choice' || q.type === 'true/false') {
                optionsHtml += q.options.map(opt => `<label><input type="radio" name="q${index}" value="${opt}"> ${opt}</label>`).join('');
            } else {
                optionsHtml += `<input type="text" name="q${index}" placeholder="Type your answer">`;
            }
            optionsHtml += '</div>';
            questionEl.innerHTML = `<p>${index + 1}. ${q.question}</p>${optionsHtml}<div class="quiz-feedback"></div>`;
            quizDiv.appendChild(questionEl);
        });
        const checkBtn = document.createElement('button');
        checkBtn.id = 'checkQuizBtn';
        checkBtn.textContent = 'Check Answers';
        checkBtn.addEventListener('click', checkQuizAnswers);
        quizDiv.appendChild(checkBtn);
    }
    
    function checkQuizAnswers() {
        fullContent.quiz.forEach((questionData, index) => {
            const qEl = document.querySelector(`.quiz-question[data-question-index="${index}"]`);
            const feedbackEl = qEl.querySelector('.quiz-feedback');
            let userAnswer;
            if (questionData.type === 'multiple-choice' || questionData.type === 'true/false') {
                const checkedRadio = qEl.querySelector(`input[name="q${index}"]:checked`);
                userAnswer = checkedRadio ? checkedRadio.value : '';
            } else {
                const inputField = qEl.querySelector(`input[name="q${index}"]`);
                userAnswer = inputField ? inputField.value.trim() : '';
            }
            if (userAnswer.toLowerCase() === questionData.answer.toLowerCase()) {
                feedbackEl.textContent = 'Correct!';
                feedbackEl.className = 'quiz-feedback correct';
            } else {
                feedbackEl.textContent = `Incorrect. The correct answer is: ${questionData.answer}`;
                feedbackEl.className = 'quiz-feedback incorrect';
            }
        });
    }
});
