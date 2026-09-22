export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch(
      "https://api.adsb.lol/v2/point/-19.794722/-47.958611/70"
    );

    const text = await response.text();
    
    // Adicione isso para ver o que a API externa está respondendo nos logs da Vercel
    console.log("Status ADSB:", response.status);
    console.log("Resposta ADSB:", text);

    let data = JSON.parse(text);
    const ac = data.ac || [];

    return res.status(200).json({
      ac,
      ok: true
    });

  } catch (err) {
    console.error("Erro interno:", err); // Loga o erro real no console da Vercel
    return res.status(500).json({
      ac: [],
      error: true,
      message: err.toString()
    });
  }
}
