export default async function handler(req, res) {
  // 1. Sempre define o CORS logo no início para qualquer resposta (sucesso ou erro)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 2. Se for uma requisição OPTIONS (preflight do navegador), encerra aqui com sucesso
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const response = await fetch(
      "https://api.adsb.lol/v2/point/-19.794722/-47.958611/70"
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        ac: [],
        error: true,
        message: "API retornou resposta inválida"
      });
    }

    const ac = data.ac || [];

    return res.status(200).json({
      ac,
      ok: true
    });

  } catch (err) {
    return res.status(500).json({
      ac: [],
      error: true,
      message: err.toString()
    });
  }
}
