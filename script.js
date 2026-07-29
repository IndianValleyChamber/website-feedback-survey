"use strict";

/* =========================================================
   GOOGLE APPS SCRIPT ENDPOINT
========================================================= */

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxG6RZTmvXq_Iedu0KuHeUHIZnGuZaRQLZK9kxhAw38XORgOWyqNirWUVPAtx6tDdiBBQ/exec";


/* =========================================================
   ELEMENTS
========================================================= */

const surveyForm = document.getElementById("surveyForm");
const submitButton = document.getElementById("submitButton");
const formStatus = document.getElementById("formStatus");
const successPanel = document.getElementById("successPanel");

const visitMoreOften = document.getElementById("visitMoreOften");
const additionalComments = document.getElementById("additionalComments");

const visitMoreOftenCount =
  document.getElementById("visitMoreOftenCount");

const additionalCommentsCount =
  document.getElementById("additionalCommentsCount");


/* =========================================================
   CHARACTER COUNTERS
========================================================= */

function updateCharacterCount(field, counter) {
  counter.textContent = field.value.length;
}

visitMoreOften.addEventListener("input", () => {
  updateCharacterCount(visitMoreOften, visitMoreOftenCount);
});

additionalComments.addEventListener("input", () => {
  updateCharacterCount(
    additionalComments,
    additionalCommentsCount
  );
});


/* =========================================================
   CHECKBOX LIMITS
========================================================= */

function enforceCheckboxLimit(groupName, maximum) {
  const checkboxes = Array.from(
    document.querySelectorAll(
      `[data-limit-group="${groupName}"]`
    )
  );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selected = checkboxes.filter(
        (item) => item.checked
      );

      const limitReached = selected.length >= maximum;

      checkboxes.forEach((item) => {
        if (!item.checked) {
          item.disabled = limitReached;
        }
      });
    });
  });
}

enforceCheckboxLimit("improvements", 3);
enforceCheckboxLimit("personality", 3);


/* =========================================================
   HELPERS
========================================================= */

function getRadioValue(name) {
  const selected = document.querySelector(
    `input[name="${name}"]:checked`
  );

  return selected ? selected.value : "";
}


function getCheckboxValues(name) {
  return Array.from(
    document.querySelectorAll(
      `input[name="${name}"]:checked`
    )
  ).map((checkbox) => checkbox.value);
}


function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;

  const questionCard = errorElement.closest(".question-card");

  if (questionCard) {
    questionCard.classList.add("has-error");
  }
}


function clearError(elementId) {
  const errorElement = document.getElementById(elementId);

  if (!errorElement) {
    return;
  }

  errorElement.textContent = "";

  const questionCard = errorElement.closest(".question-card");

  if (questionCard) {
    questionCard.classList.remove("has-error");
  }
}


function clearValidationErrors() {
  clearError("primaryReasonError");
  clearError("improvementsError");
  clearError("personalityError");

  formStatus.textContent = "";
  formStatus.classList.remove("error");
}


function focusFirstInvalidField() {
  const invalidField = surveyForm.querySelector(":invalid");

  if (invalidField) {
    invalidField.focus();

    const questionCard = invalidField.closest(".question-card");

    if (questionCard) {
      questionCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }
}


/* =========================================================
   CUSTOM VALIDATION
========================================================= */

function validateCheckboxGroups() {
  let isValid = true;

  const primaryReasons =
    getCheckboxValues("primaryReasonForVisiting");

  const improvements =
    getCheckboxValues("mostValuableImprovements");

  const personality =
    getCheckboxValues("websitePersonality");

  if (primaryReasons.length === 0) {
    showError(
      "primaryReasonError",
      "Please select at least one reason."
    );

    isValid = false;
  }

  if (improvements.length === 0) {
    showError(
      "improvementsError",
      "Please select at least one improvement."
    );

    isValid = false;
  }

  if (personality.length === 0) {
    showError(
      "personalityError",
      "Please select at least one quality."
    );

    isValid = false;
  }

  return isValid;
}


/* =========================================================
   FORM DATA
========================================================= */

function buildSubmissionData() {
  return {
    participantType:
      getRadioValue("participantType"),

    websiteVisitFrequency:
      getRadioValue("websiteVisitFrequency"),

    primaryReasonForVisiting:
      getCheckboxValues("primaryReasonForVisiting"),

    currentWebsiteExperience:
      getRadioValue("currentWebsiteExperience"),

    mostValuableImprovements:
      getCheckboxValues("mostValuableImprovements"),

    highestPriority:
      getRadioValue("highestPriority"),

    preferredWebsiteDirection:
      getRadioValue("preferredWebsiteDirection"),

    websitePersonality:
      getCheckboxValues("websitePersonality"),

    visitMoreOften:
      visitMoreOften.value.trim(),

    additionalComments:
      additionalComments.value.trim()
  };
}


/* =========================================================
   SUBMIT
========================================================= */

surveyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearValidationErrors();

  /*
    Basic spam protection:
    Real visitors will never see or complete this field.
  */

  const honeypot =
    document.getElementById("companyWebsite").value.trim();

  if (honeypot !== "") {
    return;
  }

  const browserValidationPassed =
    surveyForm.checkValidity();

  const checkboxValidationPassed =
    validateCheckboxGroups();

  if (
    !browserValidationPassed ||
    !checkboxValidationPassed
  ) {
    surveyForm.reportValidity();
    focusFirstInvalidField();
    return;
  }

  const submissionData = buildSubmissionData();

  submitButton.disabled = true;
  submitButton.querySelector(".button-text").textContent =
    "Submitting...";

  formStatus.textContent =
    "Please wait while your response is recorded.";

  formStatus.classList.remove("error");

  try {
    /*
      text/plain avoids a browser CORS preflight while still
      sending valid JSON to the Apps Script doPost function.
    */

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(submissionData),
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(
        `Submission failed with status ${response.status}.`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message || "The response could not be saved."
      );
    }

    surveyForm.reset();

    surveyForm.hidden = true;
    successPanel.hidden = false;

    successPanel.focus();

    successPanel.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  } catch (error) {
    console.error("Survey submission error:", error);

    submitButton.disabled = false;

    submitButton.querySelector(".button-text").textContent =
      "Submit Feedback";

    formStatus.textContent =
      "Your response could not be submitted. Please check your connection and try again.";

    formStatus.classList.add("error");
  }
});
