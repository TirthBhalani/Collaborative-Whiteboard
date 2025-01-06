document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voice');
    const voiceStatus = document.getElementById('voice-status');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Sorry, your browser doesn't support the Web Speech API.");
        voiceBtn.disabled = true;
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    let isRecording = false;

    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Start Recording';
            voiceStatus.style.display = 'block';
            voiceStatus.textContent = 'Recording stopped.';
        } else {
            recognition.start();
            voiceBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Recording';
            voiceStatus.style.display = 'block';
            voiceStatus.textContent = 'Listening...';
        }
        isRecording = !isRecording;
    });

    recognition.addEventListener('result', (event) => {
        const transcript = event.results[0][0].transcript;

        voiceStatus.textContent = `Voice Note: ${transcript}`;
    });

    recognition.addEventListener('error', (event) => {
        console.error('Recognition error:', event.error);
        voiceStatus.textContent = `Error: ${event.error}`;
        setTimeout(() => {
            voiceStatus.style.display = 'none';
        }, 3000);
    });

    recognition.addEventListener('end', () => {
        if (isRecording) {
            recognition.stop();
            voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Start Recording';
            voiceStatus.style.display = 'block';
            voiceStatus.textContent = 'Recording stopped.';
            isRecording = false;
        }
    });
});
