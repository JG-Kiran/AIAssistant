const url = 'http://localhost:3000/api/webhooks/zoho'; // Adjust port if needed

const payload = {
  // Replace with a realistic Zoho webhook payload
  sampleKey: "sampleValue",
  anotherKey: 123
};

async function testWebhook() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebhook(); 