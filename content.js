function extractSolution() {
    const solutionElement = document.querySelector('pre');
    if (!solutionElement) {
        return;
    }

    const solution = solutionElement.textContent;
    const problemId = window.location.pathname.split('/')[3];
    const submissionId = window.location.pathname.split('/')[5];

    chrome.runtime.sendMessage({
        action: 'pushToGithub',
        data: {
            solution,
            problemId,
            submissionId
        }
    });
}