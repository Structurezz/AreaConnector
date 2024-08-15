
import twilio from "twilio";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Function to create a call
export async function createCall() {
  try {
    const call = await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER, // Twilio number
      to: "+123456789", // Recipient's number
      url: "http://demo.twilio.com/docs/voice.xml", // Twilio XML URL
    });

    console.log("Call SID:", call.sid);
  } catch (error) {
    console.error("Error creating call:", error);
  }
}
