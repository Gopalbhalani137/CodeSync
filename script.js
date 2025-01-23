function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

const showLogin = getQueryParam('showLogin') === '1';
    document.addEventListener('DOMContentLoaded',async () => {
        const loginSection = document.getElementById('login-section');
    const mainSection = document.getElementById('main-section');
    const headerid = document.getElementById('headerid');
    const loaderid = document.getElementById('loadercontainer');
    try {
        const data = await new Promise(resolve => {
            chrome.storage.sync.get(['githubToken', 'isSetupComplete', 'repoLink', 'codeforcesUsername'], resolve);
        });
        console.log('Initial state check:', data);
        const showLogin = new URLSearchParams(window.location.search).get('showLogin') === '1';

        if (showLogin) {
            headerid.style.display = 'block';
            loaderid.style.display = 'none';
            loginSection.style.display = 'block';
            mainSection.style.display = 'none';
        } else if (data.githubToken && data.isSetupComplete && data.repoLink && data.codeforcesUsername) {
            headerid.style.display = 'none';
            loaderid.style.display = 'flex';

            loginSection.style.display = 'none';
            mainSection.style.display = 'none';
            // fetchAndPushSubmissions(data);
        } else {
            headerid.style.display = 'block';
            loaderid.style.display = 'none';
            loginSection.style.display = 'block';
            mainSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error:', error);
    }
        const form = document.getElementById('user-form');
        const loginButton = document.getElementById('github-login');
        const logoutButton = document.getElementById('logout');
        const inforepo = document.getElementById('inforepo');
        const infohandle = document.getElementById('infohandle');
        loginButton.addEventListener('click', async () => {
            try {
                // Fetch the GitHub OAuth authorization URL from the backend
                const authUrlResponse = await fetch('https://codesync-b.onrender.com/auth/github/url',{
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                });
                if (!authUrlResponse.ok) {
                    throw new Error('Failed to fetch GitHub OAuth URL');
                }
        
                const { authUrl } = await authUrlResponse.json();
                console.log("AUTH_URL:", authUrl);
        
                // Open the GitHub OAuth authorization page
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { action: "authenticate", url: authUrl },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Runtime error details:", chrome.runtime.lastError);
                                reject(chrome.runtime.lastError);
                            } else {
                                console.log("Message response:", response);
                                resolve(response);
                            }
                        }
                    );
                });
        
                if (response && response.code) {
                    console.log("Received code:", response.code);
                    await exchangeCodeForToken(response.code); // Call the backend API to exchange code for token
                } else {
                    throw new Error('Authentication failed: No code received');
                }
            } catch (error) {
                console.error('Authentication error details:', error);
                alert('Failed to authenticate with GitHub. Please try again.');
            }
        });

        // Logout button click event
        logoutButton.addEventListener('click', () => {
            chrome.storage.sync.clear(() => {
                chrome.runtime.sendMessage({ action: 'loggedOut' });
                window.close();
            });
        });

        // Form submit event with validation
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
        
            inforepo.style.display = 'none';
            infohandle.style.display = 'none';
        
            const repoLink = document.getElementById('repo-link').value;
            const codeforcesUsername = document.getElementById('codeforces-username').value;
        
            try {
                const repoPath = repoLink.startsWith('https://github.com/') 
                    ? extractRepoFromUrl(repoLink) 
                    : repoLink;
        
                if (!await validateGitHubRepo(repoPath)) {
                    inforepo.textContent = 'Repository does not exist or is private. Please create a public repository.';
                    inforepo.style.display = 'block';
                    return;
                }
        
                if (!await validateCodeforcesHandle(codeforcesUsername)) {
                    infohandle.textContent = 'Codeforces handle does not exist. Please provide a valid handle.';
                    infohandle.style.display = 'block';
                    return;
                }
        
                // Fetch existing data from chrome.storage.sync
                const existingData = await new Promise((resolve) => {
                    chrome.storage.sync.get(['repoLink', 'codeforcesUsername', 'isSetupComplete'], resolve);
                });
        
                // Merge or create new data
                const newData = {
                    repoLink: repoPath,
                    codeforcesUsername: codeforcesUsername,
                    isSetupComplete: true,
                };
        
                const updatedData = { ...existingData, ...newData };
        
                // Save the updated data to chrome.storage.sync
                await new Promise((resolve) => {
                    chrome.storage.sync.set(updatedData, resolve);
                });
        
                console.log("Settings saved successfully");
                chrome.action.setPopup({ popup: 'popup.html' });
                alert('setting saved successfully')
                // Trigger fetch and push submissions
                // await fetchAndPushSubmissions(updatedData);
                window.close();
            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            } finally {
                submitButton.disabled = false;
            }
        });
        


        // Sync now button click event
        // syncButton.addEventListener('click', () => {
        //     chrome.runtime.sendMessage({ action: 'syncNow' });
        // });

        // Show main section
        function showMainSection() {
            loginSection.style.display = 'none';
            mainSection.style.display = 'block';
        }

        // Show login section
        // function showLoginSection() {
        //     mainSection.style.display = 'none';
        //     loginSection.style.display = 'block';

        //     // Clear any existing form data
        //     document.getElementById('repo-link').value = '';
        //     document.getElementById('codeforces-username').value = '';

        //     // Reset the setup state
        //     chrome.storage.sync.set({ isSetupComplete: false }, () => {
        //         console.log('Setup state reset for newcomers.');
        //     });
        // }

        // // Load user data
        // function loadUserData() {
        //     chrome.storage.sync.get(['repoLink', 'codeforcesUsername'], (data) => {
        //         if (data.repoLink) {
        //             document.getElementById('repo-link').value = data.repoLink;
        //         }
        //         if (data.codeforcesUsername) {
        //             document.getElementById('codeforces-username').value = data.codeforcesUsername;
        //         }
        //     });
        // }

        // Function to exchange GitHub OAuth code for access token
        async function exchangeCodeForToken(code) {
            try {
                const response = await fetch('https://codesync-b.onrender.com/auth/github', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ code })
                });
        
                if (!response.ok) {
                    throw new Error('Failed to exchange code for token');
                }
        
                const data = await response.json();
                if (data.accessToken) {
                    await new Promise((resolve) => {
                        chrome.storage.sync.set({ githubToken: data.accessToken }, resolve);
                    });
                    console.log("GitHub token saved.");
                    showMainSection();
                } else {
                    throw new Error(data.error || 'No access token received');
                }
            } catch (error) {
                console.error('Token exchange failed:', error);
                alert('GitHub authentication failed. Please try again.');
            }
        }

        // Function to validate GitHub repository
        async function validateGitHubRepo(repoPath) {
            try {
                const [username, repoName] = repoPath.split('/');
                if (!username || !repoName) {
                    throw new Error('Invalid repository format. Use "username/repository".');
                }
        
                // Get the GitHub token from storage
                const data = await new Promise((resolve) => {
                    chrome.storage.sync.get(['githubToken'], resolve);
                });
        
                if (!data.githubToken) {
                    throw new Error('GitHub token not found. Please log in again.');
                }
        
                // Send the repository path and access token to the backend for validation
                const response = await fetch('https://codesync-b.onrender.com/validate-repo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        accessToken: data.githubToken,
                        repo: `${username}/${repoName}`,
                    }),
                });
        
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to validate repository.');
                }
        
                const result = await response.json();
                console.log(result.message); // Log success message
                return true;
            } catch (error) {
                console.error('Error validating GitHub repository:', error);
                throw error;
            }
        }

        // Function to validate Codeforces handle
        async function validateCodeforcesHandle(handle) {
            try {
                const response = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
                const data = await response.json();
                if (data.status !== 'OK') {
                    throw new Error('Codeforces handle does not exist.');
                }
                return true;
            } catch (error) {
                console.error('Error validating Codeforces handle:', error);
                throw error;
            }
        }

        // Function to extract "username/repo" from the full URL
        function extractRepoFromUrl(url) {
            try {
                const parsedUrl = new URL(url);
                if (parsedUrl.hostname === 'github.com') {
                    const pathParts = parsedUrl.pathname.split('/').filter(part => part); // Remove empty parts
                    if (pathParts.length >= 2) {
                        return `${pathParts[0]}/${pathParts[1]}`; // Return "username/repo"
                    }
                }
                throw new Error('Invalid GitHub URL. Use "https://github.com/username/repo".');
            } catch (error) {
                throw new Error('Invalid URL format.');
            }
        }

        // Function to fetch and push submissions
        async function fetchAndPushSubmissions(data) {    
            const submissions = await fetchSubmissions(data.codeforcesUsername);
            console.log('Submissions:', submissions);
            if (!submissions || submissions.length === 0) {
                throw new Error('No submissions found');
            }
            await pushToGitHub(data.repoLink, submissions, data.githubToken);
            console.log('Sync completed successfully');
        }

        // Function to fetch Codeforces submissions
        async function fetchSubmissions(handle) {
            try {
                const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
                const data = await response.json();
                if (data.status !== 'OK') {
                    throw new Error('Failed to fetch submissions.');
                }
                return data.result; // Return the list of submissions
            } catch (error) {
                console.error('Error fetching submissions:', error);
                throw error;
            }
        }

        // Function to push submissions to GitHub
        async function pushToGitHub(repoLink, submissions, githubToken) {
            try {
                const [username, repoName] = repoLink.split('/');
                const latestSubmission = submissions[0];
                const problemName = latestSubmission.problem.name.replace(/[^a-zA-Z0-9]/g, '_');
        
                const languageMap = {
                    'GNU C++17': '.cpp',
                    'GNU C++14': '.cpp',
                    'GNU C++11': '.cpp',
                    'C++17 (GCC 7-32)': '.cpp',
                    'C++23 (GCC 14-64, msys2)': '.cpp',
                    'C++20 (GCC 13-64)': '.cpp',
                    'GNU C': '.c',
                    'Python 2': '.py',
                    'Python 3': '.py',
                    'PyPy 2' : '.py',
                    'PyPy 3' : '.py',
                    'PyPy 3-64' : '.py',
                    'Java 8': '.java',
                    'Java 11': '.java',
                    "Java 21": ".java",
                    'Kotlin 1.7': '.kt',
                    'Kotlin 1.9': '.kt',
                    'Go': '.go',
                    'Rust 2021': '.rs',
                    'Ruby 3': '.rb',
                    'Scala': '.scala',
                    'JavaScript': '.js',
                    'Node.js': '.js',
                    'TypeScript': '.ts',
                    "C# 8": ".cs",
                    "C# 10": ".cs",
                    "Mono C": ".c",
                    "D": ".d",
                    "Haskell": ".hs",
                    "FPC": ".pas",
                    "PHP": ".php",

                };
        
                const languageExtension = languageMap[latestSubmission.programmingLanguage] || '.txt';
                const fileName = `${problemName}${languageExtension}`;
        
                // Fetch the submission code
                const code = await fetchSubmissionCode(latestSubmission.contestId, latestSubmission.id);
        
                // Check if the file exists
                const fileUrl = `https://api.github.com/repos/${username}/${repoName}/contents/${fileName}`;
                const fileResponse = await fetch(fileUrl, {
                    headers: { Authorization: `Bearer ${githubToken}` },
                });
        
                const fileData = fileResponse.ok ? await fileResponse.json() : null;
                const sha = fileData?.sha;
        
                // Prepare the payload
                const payload = {
                    message: `Add/update submission for problem ${problemName}`,
                    content: btoa(code), // Encode code as base64
                };
        
                if (sha) {
                    payload.sha = sha; // Include sha for updates
                }
        
                // Push or update the file
                const response = await fetch(fileUrl, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });
        
                if (!response.ok) {
                    throw new Error('Failed to push/update submission on GitHub.');
                }
        
                console.log('Submission pushed/updated successfully on GitHub.');
                alert('Submission pushed/updated successfully on GitHub.');
                window.close();
            } catch (error) {
                console.error('Error pushing/updating submission to GitHub:', error);
            }
        }
        async function fetchSubmissionCode(contestId, submissionId) {
            const url = `https://codeforces.com/contest/${contestId}/submission/${submissionId}`;
            console.log('Fetching submission code from:', url);
            try {
                const response = await fetch(url);
                console.log('Response:', response);
                if (!response.ok) {
                    throw new Error(`Failed to fetch submission page. Status: ${response.status}`);
                }
        
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const codeElement = doc.querySelector('pre#program-source-text');
                if (!codeElement) {
                    throw new Error('Failed to extract code from submission page. Code block not found.');
                }      
                const code = codeElement.textContent;
                console.log('Code extracted successfully:', code);
                return code;
            } catch (error) {
                alert('There is no latest submission please make a submission first');
                window.close();
                console.error('Error fetching submission code:', error);
                throw error;
            }
        }
    });