import { utf8ToBytes, bytesToUtf8, toHex, fromHex, md5, crc32 } from './core.ts';

export interface Format {
  id: string;
  name: string;
  category: string;
  encode: (input: string, options?: any) => string | Promise<string>;
  decode?: (input: string, options?: any) => string | Promise<string>;
}

const applyDelimiter = (arr: string[], delimiter: string) => {
  if (delimiter === 'None') return arr.join('');
  if (delimiter === 'Space') return arr.join(' ');
  if (delimiter === 'Comma') return arr.join(',');
  if (delimiter === 'Colon') return arr.join(':');
  if (delimiter === '0x') return arr.map(x => '0x' + x).join(' ');
  if (delimiter === '0b') return arr.map(x => '0b' + x).join(' ');
  return arr.join(delimiter);
};

const removeDelimiter = (str: string) => {
  return str.replace(/0x/g, '').replace(/0b/g, '').replace(/[^0-9a-zA-Z]/g, '');
};

const hash = async (algo: string, str: string) => {
  const bytes = utf8ToBytes(str);
  const digest = await crypto.subtle.digest(algo, bytes);
  return toHex(new Uint8Array(digest));
};

export const formats: Format[] = [
  // Category 1: Radix & Bitwise -> 진법 & 비트 연산
  {
    id: 'utf8', name: '일반 텍스트 (UTF-8)', category: '진법 & 비트 연산',
    encode: (val) => val,
    decode: (val) => val,
  },
  {
    id: 'binary', name: '2진수 (Binary)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(2).padStart(8, '0')), opt?.delimiter || 'Space'),
    decode: (val) => {
      const clean = removeDelimiter(val);
      if (clean.length % 8 !== 0) throw new Error('Invalid binary length');
      if (!/^[01]*$/.test(clean)) throw new Error('잘못된 2진수입니다.');
      const bytes = new Uint8Array(clean.length / 8);
      for(let i=0; i<bytes.length; i++) {
        const value = parseInt(clean.substring(i*8, i*8+8), 2);
        if (value > 255) throw new Error('바이트 범위(0~255)를 벗어났습니다.');
        bytes[i] = value;
      }
      return bytesToUtf8(bytes);
    }
  },
  {
    id: 'ternary', name: '3진수 (Ternary)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(3).padStart(6, '0')), opt?.delimiter || 'Space'),
    decode: (val) => {
      const clean = removeDelimiter(val);
      if (clean.length % 6 !== 0) throw new Error('Invalid ternary length');
      if (!/^[012]*$/.test(clean)) throw new Error('잘못된 3진수입니다.');
      const bytes = new Uint8Array(clean.length / 6);
      for(let i=0; i<bytes.length; i++) {
        const value = parseInt(clean.substring(i*6, i*6+6), 3);
        if (value > 255) throw new Error('바이트 범위(0~255)를 벗어났습니다.');
        bytes[i] = value;
      }
      return bytesToUtf8(bytes);
    }
  },
  {
    id: 'quaternary', name: '4진수 (Quaternary)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(4).padStart(4, '0')), opt?.delimiter || 'Space'),
    decode: (val) => {
      const clean = removeDelimiter(val);
      if (clean.length % 4 !== 0) throw new Error('Invalid quaternary length');
      if (!/^[0123]*$/.test(clean)) throw new Error('잘못된 4진수입니다.');
      const bytes = new Uint8Array(clean.length / 4);
      for(let i=0; i<bytes.length; i++) {
        const value = parseInt(clean.substring(i*4, i*4+4), 4);
        if (value > 255) throw new Error('바이트 범위(0~255)를 벗어났습니다.');
        bytes[i] = value;
      }
      return bytesToUtf8(bytes);
    }
  },
  {
    id: 'octal', name: '8진수 (Octal)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(8).padStart(3, '0')), opt?.delimiter || 'Space'),
    decode: (val) => {
      const clean = removeDelimiter(val);
      if (clean.length % 3 !== 0) throw new Error('Invalid octal length');
      if (!/^[01234567]*$/.test(clean)) throw new Error('잘못된 8진수입니다.');
      const bytes = new Uint8Array(clean.length / 3);
      for(let i=0; i<bytes.length; i++) {
        const value = parseInt(clean.substring(i*3, i*3+3), 8);
        if (value > 255) throw new Error('바이트 범위(0~255)를 벗어났습니다.');
        bytes[i] = value;
      }
      return bytesToUtf8(bytes);
    }
  },
  {
    id: 'decimal', name: '10진수 (Decimal) / ASCII', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(10)), opt?.delimiter || 'Space'),
    decode: (val) => {
      const parts = val.trim().split(/[^0-9]+/).filter(Boolean);
      return bytesToUtf8(new Uint8Array(parts.map(p => parseInt(p, 10))));
    }
  },
  {
    id: 'unicode-dec', name: '유니코드 코드 포인트 (Dec)', category: '진법 & 비트 연산',
    encode: (val) => Array.from(val).map(c => c.codePointAt(0)).join(' '),
    decode: (val) => val.trim().split(/\s+/).filter(Boolean).map(c => String.fromCodePoint(parseInt(c, 10))).join('')
  },
  {
    id: 'hex', name: '16진수 (Hex)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => b.toString(16).padStart(2, '0')[opt?.hexUpper ? 'toUpperCase' : 'toLowerCase']()), opt?.delimiter || 'Space'),
    decode: (val) => bytesToUtf8(fromHex(removeDelimiter(val)))
  },
  {
    id: 'hexdump', name: '헥스 덤프 (Hex Dump)', category: '진법 & 비트 연산',
    encode: (val, opt) => {
      const bytes = utf8ToBytes(val);
      let dump = '';
      for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        const offset = i.toString(16).padStart(8, '0');
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')[opt?.hexUpper ? 'toUpperCase' : 'toLowerCase']()).join(' ').padEnd(16 * 3 - 1, ' ');
        const ascii = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
        dump += `${offset}  ${hex}  |${ascii}|\n`;
      }
      return dump.trim();
    },
  },
  {
    id: 'bit-inversion', name: '비트 반전 (NOT 연산)', category: '진법 & 비트 연산',
    encode: (val, opt) => applyDelimiter(Array.from(utf8ToBytes(val)).map(b => (~b & 0xFF).toString(2).padStart(8, '0')), opt?.delimiter || 'Space'),
    decode: (val) => {
      const clean = removeDelimiter(val);
      if (clean.length % 8 !== 0) throw new Error('Invalid binary length');
      if (!/^[01]*$/.test(clean)) throw new Error('잘못된 2진수입니다.');
      const bytes = new Uint8Array(clean.length / 8);
      for(let i=0; i<bytes.length; i++) bytes[i] = (~parseInt(clean.substring(i*8, i*8+8), 2)) & 0xFF;
      return bytesToUtf8(bytes);
    }
  },

  // Category 2: Base Encodings -> 인코딩 (Base)
  {
    id: 'base16', name: 'Base16', category: '인코딩 (Base)',
    encode: (val) => toHex(utf8ToBytes(val), true),
    decode: (val) => bytesToUtf8(fromHex(val))
  },
  {
    id: 'base32', name: 'Base32', category: '인코딩 (Base)',
    encode: (val) => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      const bytes = utf8ToBytes(val);
      let bits = 0, value = 0, output = "";
      for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
      }
      if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
      while (output.length % 8 !== 0) output += "=";
      return output;
    },
    decode: (val) => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      val = val.replace(/=+$/, '');
      let bits = 0, value = 0, bytes = [];
      for (let i = 0; i < val.length; i++) {
        const idx = alphabet.indexOf(val[i].toUpperCase());
        if (idx === -1) throw new Error('Invalid Base32');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
      }
      return bytesToUtf8(new Uint8Array(bytes));
    }
  },
  {
    id: 'base32hex', name: 'Base32 Hex', category: '인코딩 (Base)',
    encode: (val) => {
      const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
      const bytes = utf8ToBytes(val);
      let bits = 0, value = 0, output = "";
      for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
      }
      if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
      while (output.length % 8 !== 0) output += "=";
      return output;
    },
    decode: (val) => {
      const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
      val = val.replace(/=+$/, '');
      let bits = 0, value = 0, bytes = [];
      for (let i = 0; i < val.length; i++) {
        const idx = alphabet.indexOf(val[i].toUpperCase());
        if (idx === -1) throw new Error('Invalid Base32Hex');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
      }
      return bytesToUtf8(new Uint8Array(bytes));
    }
  },
  {
    id: 'base36', name: 'Base36', category: '인코딩 (Base)',
    encode: (val) => {
      if (!val) return '';
      let hex = toHex(utf8ToBytes(val));
      let res = '';
      let num = BigInt('0x' + hex);
      const b36 = BigInt(36);
      if (num === 0n) return '0';
      while (num > 0n) { res = (num % b36).toString(36) + res; num /= b36; }
      return res;
    },
    decode: (val) => {
      if (!val) return '';
      let num = 0n;
      const b36 = BigInt(36);
      for (let i = 0; i < val.length; i++) {
        num = num * b36 + BigInt(parseInt(val[i], 36));
      }
      let hex = num.toString(16);
      if (hex.length % 2 !== 0) hex = '0' + hex;
      return bytesToUtf8(fromHex(hex));
    }
  },
  {
    id: 'base58', name: 'Base58', category: '인코딩 (Base)',
    encode: (val) => {
      if (!val) return '';
      const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const bytes = utf8ToBytes(val);
      let digits = [0];
      for (let i = 0; i < bytes.length; i++) {
        for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
        digits[0] += bytes[i];
        let carry = 0;
        for (let j = 0; j < digits.length; ++j) {
          digits[j] += carry;
          carry = (digits[j] / 58) | 0;
          digits[j] %= 58;
        }
        while (carry) {
          digits.push(carry % 58);
          carry = (carry / 58) | 0;
        }
      }
      for (let i = 0; i < bytes.length && bytes[i] === 0; i++) digits.push(0);
      return digits.reverse().map(d => ALPHABET[d]).join('');
    },
    decode: (val) => {
      if (!val) return '';
      const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let bytes = [0];
      for (let i = 0; i < val.length; i++) {
        const c = val[i];
        if (!(ALPHABET.includes(c))) throw new Error('Invalid Base58');
        for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
        bytes[0] += ALPHABET.indexOf(c);
        let carry = 0;
        for (let j = 0; j < bytes.length; ++j) {
          bytes[j] += carry;
          carry = bytes[j] >> 8;
          bytes[j] &= 0xff;
        }
        while (carry) {
          bytes.push(carry & 0xff);
          carry >>= 8;
        }
      }
      for (let i = 0; i < val.length && val[i] === '1'; i++) bytes.push(0);
      return bytesToUtf8(new Uint8Array(bytes.reverse()));
    }
  },
  {
    id: 'base64', name: 'Base64 (표준)', category: '인코딩 (Base)',
    encode: (val) => btoa(String.fromCharCode(...utf8ToBytes(val))),
    decode: (val) => bytesToUtf8(new Uint8Array(atob(val).split('').map(c => c.charCodeAt(0))))
  },
  {
    id: 'base64url', name: 'Base64URL', category: '인코딩 (Base)',
    encode: (val) => btoa(String.fromCharCode(...utf8ToBytes(val))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    decode: (val) => {
      let b64 = val.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return bytesToUtf8(new Uint8Array(atob(b64).split('').map(c => c.charCodeAt(0))));
    }
  },
  {
    id: 'ascii85', name: 'Base85 / Ascii85', category: '인코딩 (Base)',
    encode: (val) => {
      const b = utf8ToBytes(val);
      let res = '';
      for (let i = 0; i < b.length; i += 4) {
        let chunk = 0, count = 0;
        for (let j = 0; j < 4; j++) {
          chunk = (chunk << 8) | (i + j < b.length ? b[i + j] : 0);
          if (i + j < b.length) count++;
        }
        if (chunk === 0 && count === 4) res += 'z';
        else {
          let str = '';
          for (let j = 0; j < 5; j++) { str = String.fromCharCode(33 + (chunk % 85)) + str; chunk = Math.floor(chunk / 85); }
          res += count < 4 ? str.substring(0, count + 1) : str;
        }
      }
      return '<~' + res + '~>';
    },
  },
  {
    id: 'punycode', name: '퓨니코드 (Punycode)', category: '인코딩 (Base)',
    encode: (val) => {
      try {
        return new URL(`http://${val}`).hostname; 
      } catch(e) { return val; }
    },
  },

  // Category 3: Web & Programming Escapes -> 이스케이프 (웹/프로그래밍)
  {
    id: 'url-percent', name: 'URL 퍼센트 인코딩', category: '이스케이프 (웹/프로그래밍)',
    encode: encodeURIComponent,
    decode: decodeURIComponent
  },
  {
    id: 'url-full', name: '전체 URL 인코딩', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(utf8ToBytes(val)).map(b => '%' + b.toString(16).padStart(2, '0').toUpperCase()).join(''),
    decode: decodeURIComponent
  },
  {
    id: 'html-named', name: 'HTML 이름 엔티티', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    decode: (val) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = val;
      return txt.value;
    }
  },
  {
    id: 'html-decimal', name: 'HTML 10진수 엔티티', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(val).map(c => `&#${c.codePointAt(0)};`).join(''),
    decode: (val) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = val;
      return txt.value;
    }
  },
  {
    id: 'html-hex', name: 'HTML 16진수 엔티티', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(val).map(c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`).join(''),
    decode: (val) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = val;
      return txt.value;
    }
  },
  {
    id: 'unicode-escape-16', name: '유니코드 이스케이프 (16-bit)', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => val.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
    decode: (val) => val.replace(/\\u([0-9a-fA-F]{4})/g, (_, m) => String.fromCharCode(parseInt(m, 16)))
  },
  {
    id: 'unicode-escape-es6', name: '유니코드 이스케이프 (ES6)', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(val).map(c => `\\u{${c.codePointAt(0)!.toString(16)}}`).join(''),
    decode: (val) => val.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, m) => String.fromCodePoint(parseInt(m, 16)))
  },
  {
    id: 'hex-escape', name: '헥스 이스케이프 (C/JS 스타일)', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(utf8ToBytes(val)).map(b => '\\x' + b.toString(16).padStart(2, '0')).join(''),
    decode: (val) => bytesToUtf8(new Uint8Array(val.split('\\x').slice(1).map(x => parseInt(x.substring(0,2), 16))))
  },
  {
    id: 'octal-escape', name: '8진수 이스케이프', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => Array.from(utf8ToBytes(val)).map(b => '\\' + b.toString(8).padStart(3, '0')).join(''),
    decode: (val) => bytesToUtf8(new Uint8Array(val.split('\\').slice(1).map(x => parseInt(x.substring(0,3), 8))))
  },
  {
    id: 'json-stringified', name: 'JSON 문자열화 (Stringify)', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => JSON.stringify(val),
    decode: (val) => { try { return JSON.parse(val); } catch(e) { throw new Error('Invalid JSON'); } }
  },
  {
    id: 'sql-hex', name: 'SQL 헥스 리터럴', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => `X'${toHex(utf8ToBytes(val), true)}'`,
    decode: (val) => {
      const match = val.match(/^X'([0-9A-Fa-f]*)'$/i);
      if (match) return bytesToUtf8(fromHex(match[1]));
      throw new Error('Invalid SQL Hex');
    }
  },
  {
    id: 'c-byte-array', name: 'C/C++ 바이트 배열', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => `const uint8_t data[] = { ${Array.from(utf8ToBytes(val)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')} };`,
    decode: (val) => {
      const match = val.match(/\{(.*?)\}/);
      if (!match) throw new Error('Invalid Array');
      const hex = match[1].replace(/0x/g, '').replace(/[^0-9a-fA-F]/g, '');
      return bytesToUtf8(fromHex(hex));
    }
  },
  {
    id: 'python-byte-string', name: 'Python 바이트 문자열', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => `b'${Array.from(utf8ToBytes(val)).map(b => '\\x' + b.toString(16).padStart(2, '0')).join('')}'`,
    decode: (val) => {
      const match = val.match(/^b['"](.*)['"]$/);
      if (!match) throw new Error('Invalid Python Byte String');
      return bytesToUtf8(new Uint8Array(match[1].split('\\x').slice(1).map(x => parseInt(x.substring(0,2), 16))));
    }
  },
  {
    id: 'jwt-decoder', name: 'JWT 페이로드 디코더', category: '이스케이프 (웹/프로그래밍)',
    encode: (val) => {
      const parts = val.split('.');
      if (parts.length === 3) {
        try {
          const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          return JSON.stringify(JSON.parse(payload), null, 2);
        } catch(e) { throw new Error('Invalid JWT'); }
      }
      throw new Error('Not a JWT');
    }
  },

  // Category 4: Naming Conventions & Case Styles -> 네이밍 규칙 & 대소문자 변환
  {
    id: 'lowercase', name: '소문자 (lower case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.toLowerCase(), decode: (val) => val.toLowerCase()
  },
  {
    id: 'uppercase', name: '대문자 (UPPER CASE)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.toUpperCase(), decode: (val) => val.toUpperCase()
  },
  {
    id: 'camelcase', name: '카멜 케이스 (camelCase)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) return "";
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
    }).replace(/[^a-zA-Z0-9]/g, '')
  },
  {
    id: 'pascalcase', name: '파스칼 케이스 (PascalCase)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match) => {
      if (+match === 0) return "";
      return match.toUpperCase();
    }).replace(/[^a-zA-Z0-9]/g, '')
  },
  {
    id: 'snakecase', name: '스네이크 케이스 (snake_case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('_') || val
  },
  {
    id: 'constantcase', name: '상수 케이스 (CONSTANT_CASE)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toUpperCase()).join('_') || val
  },
  {
    id: 'kebabcase', name: '케밥 케이스 (kebab-case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('-') || val
  },
  {
    id: 'traincase', name: '트레인 케이스 (Train-Case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join('-') || val
  },
  {
    id: 'titlecase', name: '타이틀 케이스 (Title Case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  },
  {
    id: 'sentencecase', name: '문장 케이스 (Sentence case)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
  },
  {
    id: 'alternatingcase', name: '지그재그 케이스 (aLtErNaTiNg cAsE)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => Array.from(val).map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
  },
  {
    id: 'inverted', name: '상하 반전 (Upside Down)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => {
      const map: any = {'a':'ɐ','b':'q','c':'ɔ','d':'p','e':'ǝ','f':'ɟ','g':'ƃ','h':'ɥ','i':'ᴉ','j':'ɾ','k':'ʞ','l':'l','m':'ɯ','n':'u','o':'o','p':'d','q':'b','r':'ɹ','s':'s','t':'ʇ','u':'n','v':'ʌ','w':'ʍ','x':'x','y':'ʎ','z':'z'};
      return val.toLowerCase().split('').reverse().map(c => map[c] || c).join('');
    }
  },
  {
    id: 'reversed', name: '글자 뒤집기 (Reversed Text)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => Array.from(val).reverse().join('')
  },
  {
    id: 'leetspeak', name: '리트스피크 (1337)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => {
      const map: any = {'A':'4','E':'3','G':'6','I':'1','O':'0','S':'5','T':'7'};
      return val.replace(/[AEGIOST]/gi, c => map[c.toUpperCase()] || c);
    }
  },
  {
    id: 'fullwidth', name: '전각 문자 (Fullwidth)', category: '네이밍 규칙 & 대소문자 변환',
    encode: (val) => val.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).replace(/ /g, '　'),
    decode: (val) => val.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/　/g, ' ')
  },

  // Category 5: Classical Ciphers & Alt Representations -> 암호 (고전 및 대체 표현)
  {
    id: 'morse', name: '모스 부호 (Morse Code)', category: '암호 (고전 및 대체 표현)',
    encode: (val) => {
      const map: any = {'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.','H':'....','I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.','O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-','V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.','0':'-----',' ':'/'};
      return val.toUpperCase().split('').map(c => map[c] || c).join(' ');
    },
    decode: (val) => {
      const map: any = {'.-':'A','-...':'B','-.-.':'C','-..':'D','.':'E','..-.':'F','--.':'G','....':'H','..':'I','.---':'J','-.-':'K','.-..':'L','--':'M','-.':'N','---':'O','.--.':'P','--.-':'Q','.-.':'R','...':'S','-':'T','..-':'U','...-':'V','.--':'W','-..-':'X','-.--':'Y','--..':'Z','.----':'1','..---':'2','...--':'3','....-':'4','.....':'5','-....':'6','--...':'7','---..':'8','----.':'9','-----':'0','/':' '};
      return val.split(' ').map(c => map[c] || c).join('');
    }
  },
  {
    id: 'nato', name: 'NATO 음성 기호', category: '암호 (고전 및 대체 표현)',
    encode: (val) => {
      const map: any = {'A':'Alfa','B':'Bravo','C':'Charlie','D':'Delta','E':'Echo','F':'Foxtrot','G':'Golf','H':'Hotel','I':'India','J':'Juliett','K':'Kilo','L':'Lima','M':'Mike','N':'November','O':'Oscar','P':'Papa','Q':'Quebec','R':'Romeo','S':'Sierra','T':'Tango','U':'Uniform','V':'Victor','W':'Whiskey','X':'X-ray','Y':'Yankee','Z':'Zulu',' ':' '};
      return val.toUpperCase().split('').map(c => map[c] || c).join(' ');
    }
  },
  {
    id: 'rot13', name: 'ROT13', category: '암호 (고전 및 대체 표현)',
    encode: (val) => val.replace(/[a-zA-Z]/g, c => { const code = c.charCodeAt(0) + 13; return String.fromCharCode((c <= 'Z' ? 90 : 122) >= code ? code : code - 26); }),
    decode: (val) => val.replace(/[a-zA-Z]/g, c => { const code = c.charCodeAt(0) + 13; return String.fromCharCode((c <= 'Z' ? 90 : 122) >= code ? code : code - 26); })
  },
  {
    id: 'rot47', name: 'ROT47', category: '암호 (고전 및 대체 표현)',
    encode: (val) => Array.from(val).map(c => { const code = c.charCodeAt(0); return (code >= 33 && code <= 126) ? String.fromCharCode(33 + ((code + 14) % 94)) : c; }).join(''),
    decode: (val) => Array.from(val).map(c => { const code = c.charCodeAt(0); return (code >= 33 && code <= 126) ? String.fromCharCode(33 + ((code + 14) % 94)) : c; }).join('')
  },
  {
    id: 'caesar', name: '시저 암호 (Caesar Cipher +3)', category: '암호 (고전 및 대체 표현)',
    encode: (val) => val.replace(/[a-zA-Z]/g, c => { const code = c.charCodeAt(0) + 3; return String.fromCharCode((c <= 'Z' ? 90 : 122) >= code ? code : code - 26); }),
    decode: (val) => val.replace(/[a-zA-Z]/g, c => { const code = c.charCodeAt(0) - 3; return String.fromCharCode((c <= 'Z' ? 65 : 97) <= code ? code : code + 26); })
  },
  {
    id: 'atbash', name: '아프바시 암호 (Atbash Cipher)', category: '암호 (고전 및 대체 표현)',
    encode: (val) => val.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 155 : 219) - c.charCodeAt(0))),
    decode: (val) => val.replace(/[a-z]/gi, c => String.fromCharCode((c <= 'Z' ? 155 : 219) - c.charCodeAt(0)))
  },
  {
    id: 'a1z26', name: 'A1Z26 암호', category: '암호 (고전 및 대체 표현)',
    encode: (val) => val.toUpperCase().match(/[A-Z]/g)?.map(c => c.charCodeAt(0) - 64).join('-') || '',
    decode: (val) => val.split('-').map(n => String.fromCharCode(parseInt(n) + 64)).join('')
  },
  {
    id: 'braille', name: '점자 (Braille)', category: '암호 (고전 및 대체 표현)',
    encode: (val) => {
      const map: any = {'a':'⠁','b':'⠃','c':'⠉','d':'⠙','e':'⠑','f':'⠋','g':'⠛','h':'⠓','i':'⠊','j':'⠚','k':'⠅','l':'⠇','m':'⠍','n':'⠝','o':'⠕','p':'⠏','q':'⠟','r':'⠗','s':'⠎','t':'⠞','u':'⠥','v':'⠧','w':'⠺','x':'⠭','y':'⠽','z':'⠵',' ':' '};
      return val.toLowerCase().split('').map(c => map[c] || c).join('');
    }
  },

  // Category 6: Hashes & Cryptographic Checksums -> 해시 및 체크섬
  {
    id: 'sha1', name: 'SHA-1', category: '해시 및 체크섬',
    encode: async (val) => await hash('SHA-1', val)
  },
  {
    id: 'sha256', name: 'SHA-256', category: '해시 및 체크섬',
    encode: async (val) => await hash('SHA-256', val)
  },
  {
    id: 'sha384', name: 'SHA-384', category: '해시 및 체크섬',
    encode: async (val) => await hash('SHA-384', val)
  },
  {
    id: 'sha512', name: 'SHA-512', category: '해시 및 체크섬',
    encode: async (val) => await hash('SHA-512', val)
  },
  {
    id: 'md5', name: 'MD5', category: '해시 및 체크섬',
    encode: (val) => md5(val)
  },
  {
    id: 'crc32', name: 'CRC32', category: '해시 및 체크섬',
    encode: (val) => crc32(val)
  }
];

export const categories = Array.from(new Set(formats.map(f => f.category)));
