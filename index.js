'use strict';

const got = require('got');
const Joi = require('joi');
const cors = require('cors');
const app = require('express')();
const bodyParser = require('body-parser');

app.use(cors());
app.use(bodyParser.json());

app.post('/newsletter', (req, res, next) => {
  const data = req.body;
  data.type = 'New Newsletter Subscription';
  console.log(data);

  if (validate('newsleter', data).error) {
    return res.sendStatus(400);
  }

  res.sendStatus(200);

  slackMsg([
    data.type,
    `email: ${data.email}`
  ].join('\n'));

  sendEmail({
    subject: data.type,
    text: data.email
  })
});

app.post('/contact-us', (req, res, next) => {
  const data = req.body;
  data.type = 'New Contact Us Form Submission';
  console.log(data);

  if (validate('contact', data).error) {
    return res.sendStatus(400);
  }

  res.sendStatus(200);

  const msg = [data.type];
  for (const field of ['first-name', 'last-name', 'company', 'email']) {
    if (data[field]) msg.push(`${field}: ${data[field]}`);
  }
  slackMsg(msg.join('\n'));

  sendEmail({
    subject: data.type,
    text: data.email
  })
});

app.listen(process.env.PORT || 3000, function() {
  console.log('Simple form server listening on port %d', this.address().port);
})

const transporter = require('nodemailer').createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.FROM_ADDRESS,
    pass: process.env.GOOGLE_PASSWORD
  }
});
function sendEmail(msg) {
  return transporter.sendMail(Object.assign({
    from: process.env.FROM_ADDRESS,
    to: process.env.TO_ADDRESS,
  }, msg)).catch(err => {
    console.error('Failed to send', msg, err);
  })
}

function slackMsg(msg) {
  return got.post(process.env.WEBHOOK_URL, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: '```' + msg + '```' })
  }).catch(err => {
    console.error('Failed to Slack', msg, err);
  })
}


const newsletterSchema = Joi.object({
  email: Joi.string().email().required()
});
const contactSchema = Joi.object({
  email: Joi.string().email().required(),
  'first-name': Joi.string(),
  'last-name': Joi.string(),
  company: Joi.string(),
});
function validate(type, data) {
  switch (type) {
    case 'newsletter':
      return Joi.validate(data, newsletterSchema);
    case 'contact':
      return Joi.validate(data, contactSchema);
  }
}
