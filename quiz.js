/* =====================================================================
   IT 3203 — Project Milestone #2
   File: quiz.js
   Purpose: Client-side logic for the phishing self-assessment quiz.

   Features implemented:
     - 10-minute countdown timer (auto-submits at 0:00)
     - Records the user's completion time
     - Calculates score (10 questions, 1 point each)
     - Displays pass/fail (70% = pass), total score, per-question
       correctness, the correct answer for each question, and time spent
     - Uses colors (via CSS classes) for pass/fail and correct/incorrect
     - Provides a Retake button that fully resets the quiz state
   ===================================================================== */

(function () {
    "use strict";

    // ---------- 1. Configuration ----------
    const QUIZ_DURATION_SECONDS = 10 * 60; // 10 minutes
    const PASS_THRESHOLD_PERCENT = 70;

    // Answer key. Each entry defines how to check the user's answer.
    // type: "single"    -> exactly one correct value
    // type: "multi"     -> set of correct values, all must match
    // type: "fill"      -> accepted normalized answers (case-insensitive)
    const ANSWER_KEY = {
        1:  { type: "single", correct: "b" },
        2:  { type: "single", correct: "c" },
        3:  { type: "single", correct: "b" },
        4:  { type: "single", correct: "b" },
        5:  { type: "multi",  correct: ["a", "b", "c"] },
        6:  { type: "fill",   correct: ["multi-factor authentication", "multifactor authentication", "mfa"] },
        7:  { type: "fill",   correct: ["pretexting"] },
        8:  { type: "single", correct: "b" },
        9:  { type: "single", correct: "b" },
        10: { type: "single", correct: "c" }
    };

    // Human-readable correct answers for the results panel
    const ANSWER_TEXT = {
        1:  "B. Fraudulent messages impersonating a trusted party to steal information",
        2:  "C. Whaling",
        3:  "B. SPF, DKIM, DMARC",
        4:  "B. They often contain no malware and no malicious link",
        5:  "A, B, and C (urgent language, mismatched sender, and misleading links)",
        6:  "multi-factor authentication (MFA)",
        7:  "pretexting",
        8:  "B. Smishing",
        9:  "B. Phishing-resistant MFA such as FIDO2 / WebAuthn",
        10: "C. Layered defenses combining technology and trained, reporting users"
    };

    // ---------- 2. DOM References ----------
    const form             = document.getElementById("quiz-form");
    const timerEl          = document.getElementById("timer");
    const timerBox         = document.getElementById("timer-box");
    const resultsPanel     = document.getElementById("results-panel");
    const overallResultEl  = document.getElementById("overall-result");
    const scoreLineEl      = document.getElementById("score-line");
    const timeLineEl       = document.getElementById("time-line");
    const perQuestionEl    = document.getElementById("per-question-results");
    const retakeBtn        = document.getElementById("retake-btn");
    const resetBtn         = document.getElementById("reset-btn");

    // ---------- 3. State ----------
    let remainingSeconds = QUIZ_DURATION_SECONDS;
    let timerIntervalId  = null;
    let startTime        = null;
    let quizSubmitted    = false;

    // ---------- 4. Timer ----------
    function formatTime(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }

    function startTimer() {
        startTime = Date.now();
        remainingSeconds = QUIZ_DURATION_SECONDS;
        updateTimerDisplay();

        timerIntervalId = setInterval(function () {
            remainingSeconds--;
            updateTimerDisplay();

            // Visual warning when time is low
            if (remainingSeconds <= 60) {
                timerBox.classList.add("timer-warning");
            }

            if (remainingSeconds <= 0) {
                stopTimer();
                // Auto-submit when time runs out
                submitQuiz(true);
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerIntervalId !== null) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
        }
    }

    function updateTimerDisplay() {
        timerEl.textContent = formatTime(Math.max(remainingSeconds, 0));
    }

    // ---------- 5. Answer Checking ----------
    function getSingleAnswer(name) {
        const checked = form.querySelector('input[name="' + name + '"]:checked');
        return checked ? checked.value : null;
    }

    function getMultiAnswer(name) {
        const boxes = form.querySelectorAll('input[name="' + name + '"]:checked');
        return Array.from(boxes).map(function (b) { return b.value; }).sort();
    }

    function getFillAnswer(name) {
        const el = form.querySelector('input[name="' + name + '"]');
        return el ? el.value.trim().toLowerCase() : "";
    }

    function isCorrect(qNum) {
        const key = ANSWER_KEY[qNum];

        if (key.type === "single") {
            return getSingleAnswer("q" + qNum) === key.correct;
        }

        if (key.type === "multi") {
            const user = getMultiAnswer("q" + qNum);
            const correct = key.correct.slice().sort();
            return user.length === correct.length &&
                   user.every(function (v, i) { return v === correct[i]; });
        }

        if (key.type === "fill") {
            const user = getFillAnswer("q" + qNum);
            return key.correct.some(function (accepted) {
                return user === accepted.toLowerCase();
            });
        }

        return false;
    }

    // ---------- 6. Submission & Results ----------
    function submitQuiz(fromTimer) {
        if (quizSubmitted) return;
        quizSubmitted = true;
        stopTimer();

        // If submitted manually, compute elapsed time; if auto-submitted,
        // the full 10 minutes were consumed.
        const elapsedSeconds = fromTimer
            ? QUIZ_DURATION_SECONDS
            : Math.floor((Date.now() - startTime) / 1000);

        // Score calculation
        let score = 0;
        const perQuestion = [];

        for (let q = 1; q <= 10; q++) {
            const correct = isCorrect(q);
            if (correct) score++;
            perQuestion.push({ q: q, correct: correct });
        }

        const percent = Math.round((score / 10) * 100);
        const passed  = percent >= PASS_THRESHOLD_PERCENT;

        // Disable inputs so they can't be changed after submission
        form.querySelectorAll("input").forEach(function (el) { el.disabled = true; });

        // Populate results panel
        overallResultEl.textContent = passed ? "PASS" : "FAIL";
        overallResultEl.className = "overall-result " + (passed ? "pass" : "fail");

        scoreLineEl.textContent = "Total Score: " + score + " / 10 (" + percent + "%)";
        scoreLineEl.className = "score-line " + (passed ? "pass" : "fail");

        timeLineEl.textContent = "Time Spent: " + formatTime(elapsedSeconds);

        // Per-question breakdown
        perQuestionEl.innerHTML = "";
        perQuestion.forEach(function (item) {
            const div = document.createElement("div");
            div.className = "result-row " + (item.correct ? "correct" : "incorrect");

            const status = item.correct ? "Correct (1/1)" : "Incorrect (0/1)";
            const answerText = "Correct answer: " + ANSWER_TEXT[item.q];

            div.innerHTML =
                '<span class="result-q">Question ' + item.q + '</span>' +
                '<span class="result-status">' + status + '</span>' +
                '<span class="result-answer">' + answerText + '</span>';

            perQuestionEl.appendChild(div);
        });

        // Reveal the results panel and scroll to it
        resultsPanel.hidden = false;
        resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ---------- 7. Reset ----------
    function resetQuiz() {
        // Stop any running timer
        stopTimer();

        // Re-enable and clear all inputs
        form.querySelectorAll("input").forEach(function (el) {
            el.disabled = false;
            if (el.type === "radio" || el.type === "checkbox") {
                el.checked = false;
            } else {
                el.value = "";
            }
        });

        // Hide results
        resultsPanel.hidden = true;
        overallResultEl.textContent = "";
        scoreLineEl.textContent = "";
        timeLineEl.textContent = "";
        perQuestionEl.innerHTML = "";

        // Reset state and timer
        quizSubmitted = false;
        timerBox.classList.remove("timer-warning");
        startTimer();

        // Scroll back to the top of the quiz
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // ---------- 8. Event Wiring ----------
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitQuiz(false);
    });

    resetBtn.addEventListener("click", function () {
        resetQuiz();
    });

    retakeBtn.addEventListener("click", function () {
        resetQuiz();
    });

    // ---------- 9. Initialize ----------
    startTimer();

})();
