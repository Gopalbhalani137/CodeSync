const express=require('express');
const axios=require('axios');
const cors=require('cors');
require('dotenv').config();
const app=express();
app.use(cors());
app.use(express.json());
const PORT=process.env.PORT || 5000;
const CLIENT_ID=process.env.CLIENT_ID;
const CLIENT_SECRET=process.env.CLIENT_SECRET;
const REDIRECT_URI=process.env.REDIRECT_URI;
// Routes
app.post("/auth/github", async (req, res) => {
  const { code } = req.body;
  try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: JSON.stringify({
              client_id: CLIENT_ID,
              client_secret: CLIENT_SECRET, 
              code : code
          })
      });

      if (!response.ok) {
          throw new Error('Failed to exchange code for token');
      }
      const data = await response.json();
      if (data.access_token) {
          res.status(200).json({ accessToken: data.access_token });
      } else {
          throw new Error(data.error || 'No access token received');
      }
  } catch (error) {
      console.error('Token exchange failed:', error);
      res.status(500).json({ error: 'GitHub authentication failed. Please try again.' });
  }
});
  app.get('/auth/github/url', (req, res) => {
    try {
        const AUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        res.status(200).json({ authUrl: AUTH_URL });
    } catch (error) {
        console.error('Error generating GitHub OAuth URL:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
  app.post("/validate-repo", async (req, res) => {
    const { accessToken, repo } = req.body;
    try {
      const response = await axios.get(`https://api.github.com/repos/${repo}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      if (response.status === 200) {
        res.status(200).json({ message: "Repository validated successfully." });
      }
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to validate repository." });
    }
  });
  // app.post("/fetch-submissions", async (req, res) => {
  //   const { codeforcesHandle } = req.body;
  //   try {
  //     const response = await axios.get(
  //       `https://codeforces.com/api/user.status?handle=${codeforcesHandle}&from=1&count=10`
  //     );
  
  //     const { result } = response.data;
  //     const submissions = result.map((submission) => ({
  //       id: submission.id,
  //       problem: submission.problem.name,
  //       language: submission.programmingLanguage,
  //       verdict: submission.verdict,
  //     }));
  
  //     res.status(200).json({ submissions });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(400).json({ error: "Failed to fetch submissions." });
  //   }
  // });
  // app.post("/push-code", async (req, res) => {
  //   const { accessToken, repo, fileName, content, branch } = req.body;
  //   try {
  //     const filePath = `solutions/${fileName}`;
  
  //     // Check if file exists in the repository
  //     let sha = null;
  //     try {
  //       const fileResponse = await axios.get(
  //         `https://api.github.com/repos/${repo}/contents/${filePath}`,
  //         {
  //           headers: { Authorization: `Bearer ${accessToken}` },
  //         }
  //       );
  //       sha = fileResponse.data.sha;
  //     } catch (err) {
  //       if (err.response && err.response.status !== 404) {
  //         throw err;
  //       }
  //     }
  
  //     // Push the code
  //     await axios.put(
  //       `https://api.github.com/repos/${repo}/contents/${filePath}`,
  //       {
  //         message: `Add solution for ${fileName}`,
  //         content: Buffer.from(content).toString("base64"),
  //         branch: branch || "main",
  //         sha,
  //       },
  //       {
  //         headers: { Authorization: `Bearer ${accessToken}` },
  //       }
  //     );
  
  //     res.status(200).json({ message: "Code pushed successfully." });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(400).json({ error: "Failed to push code." });
  //   }
  // });
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });  