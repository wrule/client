/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
/* eslint-disable camelcase */
import { Socket } from 'node:net';
import { TLSSocket } from 'node:tls';
import Logger from '@/logger';

interface CipherNameAndProtocol {
  /** The cipher name. */
  name: string;
  /** SSL/TLS protocol version. */
  version: string;
  /** IETF name for the cipher suite. */
  standardName: string;
}
interface Certificate {
  /** Country code. */
  C: string;
  /** Street. */
  ST: string;
  /** Locality. */
  L: string;
  /** Organization. */
  O: string;
  /** Organizational unit. */
  OU: string;
  /** Common name. */
  CN: string;
}
interface PeerCertificate {
  subject: Certificate;
  issuer: Certificate;
  subjectaltname: string;
  // infoAccess: NodeJS.Dict<string[]>;
  // modulus: string;
  // exponent: string;
  valid_from: string;
  valid_to: string;
  // fingerprint: string;
  // fingerprint256: string;
  // ext_key_usage: string[];
  // serialNumber: string;
  // raw: Buffer;
}

interface Network {
  address?: string;
  port?: number;
  family?: string;
}

export interface SocketInfo {
  local: Network;
  remote: Network;
  // tls socket
  cipher?: CipherNameAndProtocol;
  cert?: PeerCertificate;
}

/**
 * Get Socket Local and Remote address
 * @param socket
 * @returns {SocketInfo | undefined}
 */
export const getSocketInfo = (socket?: Socket | TLSSocket): SocketInfo | undefined => {
  try {
    if (!socket || !socket.localAddress || !socket.remoteAddress) {
      return;
    }

    const ret: SocketInfo = {
      local: {
        address: socket.localAddress,
        port: socket.localPort,
        family: socket.remoteFamily,
      },
      remote: {
        address: socket.remoteAddress,
        port: socket.remotePort,
        family: socket.remoteFamily,
      },
    };
    if (socket instanceof TLSSocket) {
      ret.cipher = socket.getCipher();
      const cert = socket.getPeerCertificate(false);
      if (cert) {
        ret.cert = {
          subject: cert.subject,
          issuer: cert.issuer,
          subjectaltname: cert.subjectaltname,
          // infoAccess: NodeJS.Dict<string[]>;
          // modulus: string;
          // exponent: string;
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
        };
      }
    }
    return ret;
  } catch (e) {
    Logger.warn(`[socket] ${e.message}`);
    Logger.debug(e.stack);
  }
};
