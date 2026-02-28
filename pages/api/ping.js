export default function handler(req, res) {
  res.status(200).json({ 
    message: 'pages api works',
    timestamp: Date.now()
  })
}
