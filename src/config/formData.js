// Static sample data for the Daily Check-in form.
// Edit these values before running the automation.

module.exports = {
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfVhvb03ottVNomh-i019XlayYP_2fQ4s2q7b5jd-EHf1a_JA/viewform",

  email: "aryank@evolvan.com",

  totalWork: {
    hours: 8,
    minutes: 0,
    seconds: 0
  },

  projects: [
    {
      // Must exactly match one of the Google Form dropdown options.
      name: "File AI",

      planned: {
        hours: 5,
        minutes: 0,
        seconds: 0
      },

      billable: {
        hours: 4,
        minutes: 30,
        seconds: 0
      },

      ebhEquivalent: true,
      tasks: "Worked on frontend development, fixed UI issues, and reviewed the pending tasks."
    },
    {
      name: "Evolvan-AI Bid Writing",

      planned: {
        hours: 3,
        minutes: 0,
        seconds: 0
      },

      billable: {
        hours: 2,
        minutes: 30,
        seconds: 0
      },

      ebhEquivalent: true,
      tasks: "Worked on the assigned development tasks and tested the latest changes."
    }
  ],

  // This form has a Project 2 section and then asks whether there is
  // another project for today. Use "Yes" or "No".
  anotherProject: "No"
};
