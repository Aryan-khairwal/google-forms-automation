// Static sample data for the Daily Day Plan / Morning Check-in form.
// This form is submitted in advance at the start of the day.
// Defaults:
// - Total work: 08:30
// - Billable hours default to planned hours (unless marked as non-billable / NB)
// - EB (Equivalent Billable) is false by default; true only if explicitly requested

module.exports = {
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfVhvb03ottVNomh-i019XlayYP_2fQ4s2q7b5jd-EHf1a_JA/viewform",

  totalWork: {
    hours: 8,
    minutes: 30,
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
        hours: 5,
        minutes: 0,
        seconds: 0
      },

      ebhEquivalent: false,
      tasks: "Work on frontend development, fix UI issues, and review pending tasks."
    },
    {
      name: "Evolvan-AI Bid Writing",

      planned: {
        hours: 3,
        minutes: 30,
        seconds: 0
      },

      billable: {
        hours: 3,
        minutes: 30,
        seconds: 0
      },

      ebhEquivalent: false,
      tasks: "Work on assigned development tasks and test latest changes."
    }
  ],

  // This form has a Project 2 section and then asks whether there is
  // another project for today. Use "Yes" or "No".
  anotherProject: "No"
};
