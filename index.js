'use strict';

const got = require('got');
const Joi = require('joi');
const cors = require('cors');
const app = require('express')();
const bodyParser = require('body-parser');

// any domain
app.use(cors());
// carmera domains
// app.use(cors([
//   /\bcarmera\.com{0,1}$/i,
//   /\bcarmeraco\.github.io$/i,
// ]));

app.use(bodyParser.json());

/**
 * Routes
 */
app.post('/newsletter', (req, res, next) => {
  const data = req.body;
  data.type = 'New Newsletter Subscription';
  console.log(data);

  const review = validate('newsletter', data);
  if (review.error) {
    console.log(review.error);
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

  const review = validate('contact', data);
  if (review.error) {
    console.log(review.error);
    return res.sendStatus(400);
  }

  res.sendStatus(200);

  const msg = [data.type];
  for (const field of ['first-name', 'last-name', 'company', 'email', 'interests']) {
    if (data[field]) msg.push(`${field}: ${data[field]}`);
  }
  slackMsg(msg.join('\n'));

  sendEmail({
    subject: data.type,
    text: msg.join('\n')
  })
});

app.post('/partner', (req, res, next) => {
  const data = req.body;
  data.type = 'New Fleet Partner Request';
  console.log(data);

  const review = validate('partner', data);
  if (review.error) {
    console.log(review.error);
    return res.sendStatus(400);
  }

  res.sendStatus(200);

  const msg = [data.type];
  for (const field of ['name', 'email']) {
    if (data[field]) msg.push(`${field}: ${data[field]}`);
  }
  slackMsg(msg.join('\n'));

  sendEmail({
    subject: data.type,
    text: msg.join('\n')
  })
});

/**
 * Launch
 */
app.listen(process.env.PORT || 3000, function() {
  console.log('Simple form server listening on port %d', this.address().port);
})

/**
 * Email helpers
 */
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

/**
 * Slack helpers
 * @param {string} msg
 */
function slackMsg(msg) {
  return got.post(process.env.WEBHOOK_URL, {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: '```' + msg + '```' })
  }).catch(err => {
    console.error('Failed to Slack', msg, err);
  })
}

/**
 * Validation helpers
 */
const newsletterSchema = Joi.object({
  email: Joi.string().email().required()
});
const partnerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string()
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
      return Joi.validate(data, newsletterSchema, { allowUnknown: true });
    case 'contact':
      return Joi.validate(data, contactSchema, { allowUnknown: true });
    case 'partner':
      return Joi.validate(data, partnerSchema, { allowUnknown: true });
  }
}
