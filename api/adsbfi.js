export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await fetch('https://opendata.adsb.fi/api/v2/lat/-19.794722/lon/-47.958611/dist/70', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({ ac: [] });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(200).json({ ac: [] });
    }
}
