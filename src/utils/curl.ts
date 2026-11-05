// cURL 명령어 파서 및 언어별(Fetch, Axios, Python, Go) 코드 변환 유틸리티

export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  data: string | null;
  auth?: { username: string; password?: string };
}

export type TargetLanguage = 'fetch' | 'axios' | 'python' | 'go';

/**
 * cURL 명령어 문자열을 파싱하여 정형화된 구조체로 변환
 */
export function parseCurlCommand(rawCommand: string): ParsedCurl | null {
  try {
    const trimmed = rawCommand.trim();
    if (!trimmed) return null;

    // 여러 줄의 역슬래시 개행(\) 처리 및 캐리지 리턴 정규화
    const normalized = trimmed
      .replace(/\\\r?\n/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    // 토큰 분리 (작은따옴표, 큰따옴표, 공백 처리)
    const tokens: string[] = [];
    const regex = /[^\s"']+|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      if (match[1] !== undefined) {
        tokens.push(match[1].replace(/\\"/g, '"'));
      } else if (match[2] !== undefined) {
        tokens.push(match[2].replace(/\\'/g, "'"));
      } else {
        tokens.push(match[0]);
      }
    }

    if (tokens.length === 0) return null;

    let url = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let data: string | null = null;
    let auth: { username: string; password?: string } | undefined;

    let i = 0;
    // 첫 토큰이 curl 인 경우 건너뜀
    if (tokens[0].toLowerCase() === 'curl') {
      i = 1;
    }

    let hasExplicitMethod = false;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token === '-X' || token === '--request') {
        i++;
        if (i < tokens.length) {
          method = tokens[i].toUpperCase();
          hasExplicitMethod = true;
        }
      } else if (token === '-H' || token === '--header') {
        i++;
        if (i < tokens.length) {
          const headerLine = tokens[i];
          const colonIdx = headerLine.indexOf(':');
          if (colonIdx > 0) {
            const key = headerLine.slice(0, colonIdx).trim();
            const value = headerLine.slice(colonIdx + 1).trim();
            headers[key] = value;
          }
        }
      } else if (
        token === '-d' ||
        token === '--data' ||
        token === '--data-raw' ||
        token === '--data-binary' ||
        token === '--json'
      ) {
        i++;
        if (i < tokens.length) {
          data = tokens[i];
          if (!hasExplicitMethod) {
            method = 'POST';
          }
          if (token === '--json' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
        }
      } else if (token === '-u' || token === '--user') {
        i++;
        if (i < tokens.length) {
          const [u, p] = tokens[i].split(':');
          auth = { username: u, password: p || '' };
        }
      } else if (token.startsWith('http://') || token.startsWith('https://')) {
        url = token;
      } else if (!token.startsWith('-') && !url && token.includes('.')) {
        url = token.startsWith('http') ? token : `https://${token}`;
      }
      i++;
    }

    if (!url) {
      // 플래그 사이에서 url을 찾지 못한 경우 첫 번째 인자 검사
      for (const t of tokens) {
        if (!t.startsWith('-') && t.toLowerCase() !== 'curl' && (t.includes('/') || t.includes('.'))) {
          url = t.startsWith('http') ? t : `https://${t}`;
          break;
        }
      }
    }

    if (!url) return null;

    return {
      url,
      method,
      headers,
      data,
      auth,
    };
  } catch (err) {
    console.error('cURL 파싱 실패:', err);
    return null;
  }
}

/**
 * JavaScript Fetch 코드 생성
 */
export function generateFetchCode(parsed: ParsedCurl): string {
  const { url, method, headers, data, auth } = parsed;
  const reqHeaders: Record<string, string> = { ...headers };

  if (auth) {
    const creds = btoa(`${auth.username}:${auth.password || ''}`);
    reqHeaders['Authorization'] = `Basic ${creds}`;
  }

  const options: string[] = [];
  if (method !== 'GET') {
    options.push(`  method: '${method}',`);
  }

  if (Object.keys(reqHeaders).length > 0) {
    const headersStr = JSON.stringify(reqHeaders, null, 4)
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join('\n');
    options.push(`  headers: ${headersStr},`);
  }

  if (data) {
    let bodyFormatted = `'${data.replace(/'/g, "\\'")}'`;
    try {
      const parsedJson = JSON.parse(data);
      bodyFormatted = `JSON.stringify(${JSON.stringify(parsedJson, null, 2)})`;
    } catch {
      // 일반 문자열 본문
    }
    options.push(`  body: ${bodyFormatted},`);
  }

  if (options.length === 0) {
    return `// JavaScript Fetch
fetch('${url}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  }

  return `// JavaScript Fetch
fetch('${url}', {
${options.join('\n')}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
}

/**
 * JavaScript Axios 코드 생성
 */
export function generateAxiosCode(parsed: ParsedCurl): string {
  const { url, method, headers, data, auth } = parsed;
  const configOptions: string[] = [];

  const reqHeaders: Record<string, string> = { ...headers };
  if (Object.keys(reqHeaders).length > 0) {
    const headersStr = JSON.stringify(reqHeaders, null, 4)
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join('\n');
    configOptions.push(`  headers: ${headersStr},`);
  }

  if (auth) {
    configOptions.push(`  auth: {\n    username: '${auth.username}',\n    password: '${auth.password || ''}'\n  },`);
  }

  let dataArg = '';
  if (data) {
    try {
      const parsedJson = JSON.parse(data);
      dataArg = JSON.stringify(parsedJson, null, 2);
    } catch {
      dataArg = `'${data.replace(/'/g, "\\'")}'`;
    }
  }

  const m = method.toLowerCase();
  if (m === 'get' || m === 'delete') {
    const optStr = configOptions.length > 0 ? `, {\n${configOptions.join('\n')}\n}` : '';
    return `// JavaScript Axios
import axios from 'axios';

axios.${m}('${url}'${optStr})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`;
  }

  // POST, PUT, PATCH
  const postData = dataArg || '{}';
  const optStr = configOptions.length > 0 ? `, {\n${configOptions.join('\n')}\n}` : '';
  return `// JavaScript Axios
import axios from 'axios';

axios.${m}('${url}', ${postData}${optStr})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`;
}

/**
 * Python Requests 코드 생성
 */
export function generatePythonRequestsCode(parsed: ParsedCurl): string {
  const { url, method, headers, data, auth } = parsed;
  const lines: string[] = ['# Python Requests', 'import requests', ''];

  if (Object.keys(headers).length > 0) {
    lines.push('headers = {');
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`    "${k}": "${v.replace(/"/g, '\\"')}",`);
    }
    lines.push('}');
  }

  let isJson = false;
  if (data) {
    try {
      const parsedJson = JSON.parse(data);
      isJson = true;
      lines.push(`payload = ${JSON.stringify(parsedJson, null, 4)}`);
    } catch {
      lines.push(`data = "${data.replace(/"/g, '\\"')}"`);
    }
  }

  const args: string[] = [`"${url}"`];
  if (Object.keys(headers).length > 0) args.push('headers=headers');
  if (data) {
    args.push(isJson ? 'json=payload' : 'data=data');
  }
  if (auth) {
    args.push(`auth=("${auth.username}", "${auth.password || ''}")`);
  }

  const methodFn = method.toLowerCase();
  lines.push('');
  lines.push(`response = requests.${methodFn}(${args.join(', ')})`);
  lines.push('print(response.status_code)');
  lines.push('print(response.text)');

  return lines.join('\n');
}

/**
 * Go net/http 코드 생성
 */
export function generateGoCode(parsed: ParsedCurl): string {
  const { url, method, headers, data, auth } = parsed;

  const bodyInit = data
    ? `var jsonData = []byte(\`${data}\`)\n\treq, err := http.NewRequest("${method}", "${url}", bytes.NewBuffer(jsonData))`
    : `req, err := http.NewRequest("${method}", "${url}", nil)`;

  const headerLines: string[] = [];
  for (const [k, v] of Object.entries(headers)) {
    headerLines.push(`\treq.Header.Set("${k}", "${v}")`);
  }

  if (auth) {
    headerLines.push(`\treq.SetBasicAuth("${auth.username}", "${auth.password || ''}")`);
  }

  return `// Go net/http
package main

import (
\t"fmt"
\t"io"
\t"net/http"
${data ? '\t"bytes"\n' : ''})

func main() {
\tclient := &http.Client{}
\t${bodyInit}
\tif err != nil {
\t\tpanic(err)
\t}

${headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : ''}\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}
\tfmt.Println(string(body))
}`;
}

export interface CurlPreset {
  title: string;
  description: string;
  curl: string;
}

export const CURL_SAMPLE_PRESETS: CurlPreset[] = [
  {
    title: 'GET 기본 요청',
    description: '간단한 JSON API 데이터 조회',
    curl: `curl https://api.github.com/users/xitora -H "User-Agent: Awesome-App"`,
  },
  {
    title: 'POST JSON 전송',
    description: '인증 헤더와 JSON 바디를 포함한 POST 요청',
    curl: `curl -X POST https://api.example.com/v1/posts \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my_secret_token_123" \\
  -d '{"title": "새 게시글", "content": "내용입니다", "published": true}'`,
  },
  {
    title: 'PUT 리소스 수정',
    description: '데이터 갱신 및 커스텀 헤더',
    curl: `curl -X PUT https://api.example.com/v1/users/42 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Kim Dev", "role": "Senior Engineer"}'`,
  },
  {
    title: 'Basic Auth 인증',
    description: '사용자명 및 비밀번호를 통한 기본 인증',
    curl: `curl -u "admin:secret1234" https://api.example.com/admin/status`,
  },
];
