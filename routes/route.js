const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken"); // Import jwt for token decoding

let token = process.env.TOKEN; // Declare token variable (let instead of const to allow reassignment)

// Function to update the token
const updateToken = async () => {
  try {
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: process.env.REFRESH_TOKEN,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
        ).toString(`base64`)}`,
      },
    });
    token = response.data.access_token; // Update the token
    console.log("Token updated:", token);
  } catch (error) {
    console.error("Error updating token:", error);
  }
};

// Middleware to check token expiration before handling requests
const checkTokenExpiration = async (req, res, next) => {
  const currentTime = Date.now() / 1000; // Convert to seconds
  const decodedToken = jwt.decode(token);
  if (decodedToken.exp < currentTime) {
    // Token expired, update it
    await updateToken();
  }
  next();
};

// Route to handle OAuth authorization code
router.get("/", async (req, res) => {
  const code = req.query.code; // Extract authorization code from query parameters

  try {
    const response = axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
        ).toString(`base64`)}`,
      },
    });
    const data = await response;
    console.log("Access Token:", data.data.access_token);
    res.send(data.data.access_token); // Send access token in response
  } catch (error) {
    console.error("Error:", error);
    res.send("Error");
  }
});

// Route to fetch meetings using the Zoom API
router.get("/meetings", async (req, res) => {
  try {
    const response = await axios.get("https://api.zoom.us/v2/users/me/meetings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = response;
    res.status(200).json({ data, message: "Fetching meetings success" });
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ message: "Something went wrong!" });
  }
});

// Route to register a new meeting using the Zoom API
router.post("/register-meeting", async (req, res) => {
  const { meetingName, selectedDateTime } = req.body; // Extract meeting details from request body

  try {
    const response = await axios.post("https://api.zoom.us/v2/users/me/meetings", {
      topic: meetingName,
      start_time: selectedDateTime,
      type: 2,
      duration: 45,
      timezone: "UST",
      agenda: "TEST FOR ZOOM SDK",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 0,
        audio: "both",
        auto_recording: "none",
      },
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { data } = response;
    console.log("Meeting Data:", data);
    res.status(200).json({ data, message: "Meeting generated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ message: "Something went wrong!" });
  }
});

module.exports = router; // Export the router
