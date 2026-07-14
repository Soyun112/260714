const TABLE_NAME = process.env.SUPABASE_TABLE || 'lotto_draws';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('요청 본문이 올바른 JSON 형식이 아닙니다.'));
      }
    });

    req.on('error', reject);
  });
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  }

  return { url, key };
}

function normalizeRow(row) {
  return {
    id: row.id,
    result: row.result || { numbers: [], bonus: null },
    created_at: row.created_at || null
  };
}

function validateDraw(payload) {
  const numbers = Array.isArray(payload?.numbers) ? payload.numbers : [];
  const bonus = payload?.bonus;

  const normalizedNumbers = numbers
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value));

  if (normalizedNumbers.length !== 6) {
    throw new Error('당첨번호는 정확히 6개여야 합니다.');
  }

  const uniqueNumbers = new Set(normalizedNumbers);
  if (uniqueNumbers.size !== 6) {
    throw new Error('당첨번호는 중복되면 안 됩니다.');
  }

  for (const number of normalizedNumbers) {
    if (number < 1 || number > 45) {
      throw new Error('당첨번호는 1부터 45 사이여야 합니다.');
    }
  }

  const normalizedBonus = Number(bonus);
  if (!Number.isInteger(normalizedBonus)) {
    throw new Error('보너스 번호가 올바르지 않습니다.');
  }

  if (normalizedBonus < 1 || normalizedBonus > 45) {
    throw new Error('보너스 번호는 1부터 45 사이여야 합니다.');
  }

  if (uniqueNumbers.has(normalizedBonus)) {
    throw new Error('보너스 번호는 당첨번호와 겹치면 안 됩니다.');
  }

  return {
    numbers: normalizedNumbers.slice().sort((a, b) => a - b),
    bonus: normalizedBonus
  };
}

async function supabaseRequest(path, options = {}) {
  const { url, key } = getSupabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = Array.isArray(payload)
      ? JSON.stringify(payload)
      : payload?.message || payload?.error || `Supabase 요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
      const rows = await supabaseRequest(
        `/rest/v1/${encodeURIComponent(TABLE_NAME)}?select=id,result,created_at&order=id.desc&limit=${limit}`
      );

      sendJson(res, 200, Array.isArray(rows) ? rows.map(normalizeRow) : []);
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const result = validateDraw(body);

      const inserted = await supabaseRequest(
        `/rest/v1/${encodeURIComponent(TABLE_NAME)}?select=id,result,created_at`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({ result })
        }
      );

      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      sendJson(res, 200, normalizeRow(row));
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { error: '허용되지 않은 메서드입니다.' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || '알 수 없는 오류가 발생했습니다.' });
  }
};
