export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Adicionamos headers simulando um navegador/cliente para a API do adsb.lol não bloquear
    const response = await fetch(
      "https://api.adsb.lol/v2/point/-19.794722/-47.958611/70",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RadarApp/1.0",
          "Accept": "application/json"
        }
      }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Se voltar a dar erro, isso vai mostrar exatamente o que a API respondeu nos logs da Vercel
      console.error("Texto retornado que não é JSON:", text);
      return res.status(500).json({
        ac: [],
        error: true,
        message: `API externa retornou algo inválido: ${text.substring(0, 100)}`
      });
    }

    const ac = data.ac || [];

    return res.status(200).json({
      ac,
      ok: true
    });

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({
      ac: [],
      error: true,
      message: err.toString()
    });
  }
}
