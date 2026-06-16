export default async function handler(req, res) {
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

    res.setHeader("Access-Control-Allow-Origin", "*");

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
