import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from www.twilio.com/console
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      to: to,  // Text this number
      from: twilioPhoneNumber // From a valid Twilio number
    });
    return result;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error('Could not send SMS');
  }
};
