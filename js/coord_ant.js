const CoordTool = {
    input: document.getElementById("coordInput_coord"),
    pinImg: document.getElementById("pin_img_coord"),
    clearBtn: document.getElementById("clearInput_coord"),
    extraBtn: document.getElementById("copyExtra_coord"),
    geoBtn: document.getElementById("copyGeo_coord"),
    gmapBtn: document.getElementById("copyGmap_coord"),
    skyBtn: document.getElementById("copySky_coord"),

    init: function() {
        this.input.addEventListener("input", () => {
            this.convertCoord();
            this.toggleClear();
        });

        this.clearBtn.addEventListener("click", () => this.clearInput());

        this.extraBtn.addEventListener("click", () => this.copyText(this.extraBtn, "Extraer"));
        this.geoBtn.addEventListener("click", () => this.copyText(this.geoBtn, "GeoAISWEB"));
        this.gmapBtn.addEventListener("click", () => this.copyText(this.gmapBtn, "Google"));
        this.skyBtn.addEventListener("click", () => this.copyText(this.skyBtn, "SkyVector"));
    },

    toggleClear: function() {
        if(this.input.value.trim() !== "") {
            this.pinImg.style.display = "none";
            this.clearBtn.style.display = "inline-block";
        } else {
            this.pinImg.style.display = "inline-block";
            this.clearBtn.style.display = "none";
        }
    },

    clearInput: function() {
        this.input.value = "";
        this.toggleClear();
        this.clearOutputs();
    },

    convertCoord: function() {
        const input = this.input.value.trim();
        let lat, lon;

        if (!input) { this.clearOutputs(); return; }

        // Decimal format: -19.76, -47.96
        if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(input)) {
            const parts = input.split(",");
            lat = parseFloat(parts[0]);
            lon = parseFloat(parts[1]);

        // Format with comma decimals: 194550,18S/0475747,34W
        } else if (/^\d{6,7},\d+[NS]\/\d{7,8},\d+[EW]$/i.test(input.replace(/\s/g,''))) {
            const cleaned = input.replace(/\s/g, '').toUpperCase();
            const [latStr, lonStr] = cleaned.split('/');

            const parseGMS = (str, isLat) => {
                const dir = str.slice(-1);
                const raw = str.slice(0, -1).replace(',', '.');
                const degLen = isLat ? 2 : 3;
                const deg = parseInt(raw.slice(0, degLen));
                const min = parseInt(raw.slice(degLen, degLen + 2));
                const sec = parseFloat(raw.slice(degLen + 2));
                return this.dmsToDecimal(deg, min, sec, dir);
            };

            lat = parseGMS(latStr, true);
            lon = parseGMS(lonStr, false);

        // SkyVector compact: 1849S04835W or 194900S0475800W
        } else if (/^\d{4,7}[NS]\s?\d{4,7}[EW]$/i.test(input.replace(/\s/g,''))) {
            const cleaned = input.replace(/\s/g,'').toUpperCase();

            const extract = (str) => {
                const match = str.match(/^(\d{4,7})([NSWE])$/i);
                if (!match) return null;
                let value = match[1];
                const dir = match[2].toUpperCase();

                // Se for apenas graus+minutos, adiciona 00 segundos
                if (value.length <= (dir === 'N' || dir === 'S' ? 4 : 5)) {
                    value = value.padStart(dir === 'N' || dir === 'S' ? 4 : 5, '0') + '00';
                }

                // Agora pad para formar string SkyVector completa
                value = value.padStart(dir === 'N' || dir === 'S' ? 6 : 7, '0');
                return value + dir;
            };

            const latEnd = cleaned.search(/[NS]/i) + 1;
            const latStr = extract(cleaned.slice(0, latEnd));
            const lonStr = extract(cleaned.slice(latEnd));

            if (!latStr || !lonStr) { this.clearOutputs(); return; }

            lat = this.skyVectorToDecimal(latStr);
            lon = this.skyVectorToDecimal(lonStr);

        // Traditional DMS with spaces: 19 45 50 S / 047 58 00 W
        } else if (/^(\d{1,3})\s?(\d{1,2})\s?(\d{1,2})\s?([NS])\s*\/?\s*(\d{1,3})\s?(\d{1,2})\s?(\d{1,2})\s?([EW])$/i.test(input)) {
            const regex = /(\d{1,3})\s?(\d{1,2})\s?(\d{1,2})\s?([NS])\s*\/?\s*(\d{1,3})\s?(\d{1,2})\s?(\d{1,2})\s?([EW])/i;
            const match = input.match(regex);
            lat = this.dmsToDecimal(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), match[4].toUpperCase());
            lon = this.dmsToDecimal(parseInt(match[5]), parseInt(match[6]), parseInt(match[7]), match[8].toUpperCase());

        // New format: DMS with ° ' " and decimals, ex: 19°45'50"S 047°57'47"W or 19° 45' 50.2" S / 47° 57' 47.8" W
        } else {
            const dmsRegex = /(\d{1,3})°\s*(\d{1,2})'?\s*(\d{1,2}(?:\.\d+)?)?"?\s*([NS])\s*\/?\s*(\d{1,3})°\s*(\d{1,2})'?\s*(\d{1,2}(?:\.\d+)?)?"?\s*([EW])/i;
            const match = input.match(dmsRegex);
            if (!match) { this.clearOutputs(); return; }

            lat = this.dmsToDecimal(parseInt(match[1]), parseInt(match[2]), parseFloat(match[3]), match[4].toUpperCase());
            lon = this.dmsToDecimal(parseInt(match[5]), parseInt(match[6]), parseFloat(match[7]), match[8].toUpperCase());
        }

        this.extraBtn.dataset.tooltip = this.decimalToSkyVector(lat, lon);
        this.geoBtn.dataset.tooltip = this.decimalToDMS(lat, lon, true, true);
        this.gmapBtn.dataset.tooltip = lat + ", " + lon;
        this.skyBtn.dataset.tooltip = this.decimalToSkyVector(lat, lon);

        this.showButtons();
    },

    skyVectorToDecimal: function(str) {
        let deg, min, sec, dir, sign;
        if (str.length === 7) {
            deg = parseInt(str.slice(0,2));
            min = parseInt(str.slice(2,4));
            sec = parseInt(str.slice(4,6));
            dir = str.slice(6).toUpperCase();
        } else if (str.length === 8) {
            deg = parseInt(str.slice(0,3));
            min = parseInt(str.slice(3,5));
            sec = parseInt(str.slice(5,7));
            dir = str.slice(7).toUpperCase();
        } else {
            return NaN;
        }
        sign = (dir==='N' || dir==='E') ? 1 : -1;
        return (deg + min/60 + sec/3600) * sign;
    },

    showButtons: function() {
        [this.extraBtn, this.geoBtn, this.gmapBtn, this.skyBtn].forEach(btn => {
            btn.style.display = "inline-block";
            if (btn === this.extraBtn) btn.textContent = "Extraer";
            else if (btn === this.geoBtn) btn.textContent = "GeoAISWEB";
            else if (btn === this.gmapBtn) btn.textContent = "Google";
            else if (btn === this.skyBtn) btn.textContent = "SkyVector";
        });
    },

    clearOutputs: function() {
        [this.extraBtn, this.geoBtn, this.gmapBtn, this.skyBtn].forEach(btn => {
            btn.style.display = "none";
            btn.dataset.tooltip = "";
        });
    },

    dmsToDecimal: function(deg, min, sec, dir) {
        let dec = deg + min/60 + sec/3600;
        if (dir === "S" || dir === "W") dec *= -1;
        return dec;
    },

    decimalToDMS: function(lat, lon, geoaisweb=true, spaced=true) {
        const convert = (d, isLat) => {
            const dir = d >= 0 ? (isLat ? "N" : "E") : (isLat ? "S" : "W");
            d = Math.abs(d);
            const deg = Math.floor(d);
            const min = Math.floor((d - deg)*60);
            const sec = Math.round(((d - deg)*60 - min)*60);
            return `${deg} ${min} ${sec} ${dir}`;
        };
        return convert(lat, true) + " / " + convert(lon, false);
    },

    decimalToSkyVector: function(lat, lon) {
        const toDMSString = (d, isLat) => {
            const dir = d >= 0 ? (isLat ? "N" : "E") : (isLat ? "S" : "W");
            d = Math.abs(d);
            const deg = Math.floor(d);
            const min = Math.floor((d - deg)*60);
            const sec = Math.round(((d - deg)*60 - min)*60);
            return (deg.toString().padStart(isLat?2:3,'0') +
                    min.toString().padStart(2,'0') +
                    sec.toString().padStart(2,'0') +
                    dir);
        };
        return toDMSString(lat,true) + toDMSString(lon,false);
    },

    copyText: function(btn, name) {
        const text = btn.dataset.tooltip;
        navigator.clipboard.writeText(text);
        btn.textContent = name + " ✓";
    }
};

CoordTool.init();
