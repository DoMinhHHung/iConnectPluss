const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: 'dj5a0wx2n',
  api_key: '731712143896246',
  api_secret: 'BPwn4ELB3UL0W4obHwW3Vjeoo1M',
  secure: true
});

module.exports = cloudinary; 