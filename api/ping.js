export default function handler(req, res) {
  res.json({ ok: true, msg: "pong", time: new Date().toISOString() });
}
