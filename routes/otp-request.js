import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// UPDATE YOUR EXISTENT ROUTE LOGIC TO THIS:
router.post('/otp-request', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: "Please enter a valid phone number." });

  try {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ phone });
    if (!user) user = new User({ name: `User ${phone.slice(-4)}`, phone, provider: 'local' });
    
    user.otpCode = generatedOtp;
    user.otpExpires = expiryTime;
    await user.save();

    // LIVE TRANSMISSION LINE: Dispatches an authentic cellular SMS text message
    await twilioClient.messages.create({
      body: `Your PrepAI Platform verification safety access code is: ${generatedOtp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone // Ensure phone number is formatted with country code (e.g., +91...)
    });

    return res.status(200).json({ success: true, message: "Verification OTP code sent to your phone!" });
  } catch (err) {
    console.error("Twilio Gateway Error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to dispatch cellular text message payload." });
  }
});