import { formatJavaDouble, num, toJavaString, type JValue } from '../runtime/java/values';
import type { MockContext } from './types';

/* Java's String.format, for the specifiers lessons use. Telemetry in real FTC code is
   full of `telemetry.addData("heading", "%.1f", yaw)`, so %.1f has to round the way
   Java rounds or a kid's screen will not match their expectation. */

const SPEC = /%(\d+\$)?([-+ 0,#]*)(\d+)?(?:\.(\d+))?([sdfbxXceEn%])/g;

export function formatJava(ctx: MockContext | null, fmt: string, args: JValue[]): string {
  let next = 0;
  return fmt.replace(SPEC, (whole, _argIndex, flags: string, width: string, precision: string, conv: string) => {
    if (conv === '%') return '%';
    if (conv === 'n') return '\n';

    const arg = args[next++];
    if (arg === undefined) {
      if (ctx) ctx.fail('MissingFormatArgumentException', `Format specifier '${whole}'`);
      return whole;
    }

    let out: string;
    switch (conv) {
      case 'd': {
        const v = Math.trunc(num(arg));
        out = String(v);
        if (flags.includes(',')) out = groupThousands(out);
        if (flags.includes('+') && v >= 0) out = '+' + out;
        break;
      }
      case 'f': {
        const digits = precision === undefined ? 6 : Number(precision);
        const v = num(arg);
        out = Number.isFinite(v) ? v.toFixed(digits) : formatJavaDouble(v);
        if (flags.includes('+') && v >= 0) out = '+' + out;
        break;
      }
      case 'e':
      case 'E': {
        const digits = precision === undefined ? 6 : Number(precision);
        out = num(arg).toExponential(digits);
        if (conv === 'E') out = out.toUpperCase();
        break;
      }
      case 'x':
      case 'X': {
        out = (Math.trunc(num(arg)) >>> 0).toString(16);
        if (conv === 'X') out = out.toUpperCase();
        break;
      }
      case 'c':
        out = arg.k === 'char' ? String.fromCharCode(arg.v) : toJavaString(arg);
        break;
      case 'b':
        out = arg.k === 'boolean' ? String(arg.v) : String(arg.k !== 'null');
        break;
      default:
        out = toJavaString(arg);
        if (precision !== undefined) out = out.slice(0, Number(precision));
    }

    if (width) {
      const w = Number(width);
      if (out.length < w) {
        if (flags.includes('-')) out = out.padEnd(w, ' ');
        else if (flags.includes('0') && conv !== 's') {
          const sign = /^[+-]/.test(out) ? out[0]! : '';
          out = sign + out.slice(sign.length).padStart(w - sign.length, '0');
        } else out = out.padStart(w, ' ');
      }
    }
    return out;
  });
}

function groupThousands(s: string): string {
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
