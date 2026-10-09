// Level 10 — Networking
export default {
  id: 'L10', number: 10,
  title: 'Networking',
  summary: 'Build a working mental model of TCP/IP and administer RHEL networking the way production estates do: persistent NetworkManager profiles, routing, ARP and MTU, name resolution and a disciplined, layer-by-layer diagnostic method.',
  prerequisites: ['L09'],
  outcomes: [
    'Explain the TCP/IP layers, IPv4/IPv6 addressing, CIDR arithmetic and the difference between TCP and UDP sockets',
    'Configure persistent static IPv4 and IPv6 addressing, DNS and hostname with nmcli and understand where RHEL 8, 9 and 10 store the profiles',
    'Read and change the routing table, interpret neighbour (ARP/NDP) state and diagnose MTU problems',
    'Trace how a hostname becomes an address through nsswitch, /etc/hosts and DNS, and query DNS precisely with dig',
    'Diagnose connectivity layer by layer with ip, ss, ping, tracepath, curl, openssl s_client and tcpdump, and distinguish refused, timed out and no route to host'
  ],
  modules: [
    {
      id: 'L10-M1', title: 'TCP/IP fundamentals',
      summary: 'The layered model, IPv4 and IPv6 addressing, CIDR subnetting, and how TCP and UDP use ports and sockets.',
      lessons: [
        {
          id: 'L10-M1-T1',
          title: 'The TCP/IP model, IPv4/IPv6 addressing and CIDR',
          minutes: 45,
          objectives: [
            'Map common Linux tools and failures to the link, internet, transport and application layers',
            'Read IPv4 and IPv6 addresses with prefix lengths and identify private, loopback and link-local ranges',
            'Calculate network address, broadcast address and usable host count from CIDR notation',
            'Decide whether two hosts are on the same subnet (direct delivery) or need a router'
          ],
          prereqs: [],
          concept: `Networking is easier to troubleshoot when you think in **layers**. Each layer only trusts the one beneath it, so you diagnose bottom-up.

- **Link layer** — frames on a local segment, addressed by **MAC address** (48 bits, e.g. \`52:54:00:3a:1c:07\`). Evidence: \`ip link\` shows \`state UP\` and \`LOWER_UP\` (carrier present).
- **Internet layer** — **IP packets** routed between networks, addressed by IPv4 or IPv6 address. Evidence: \`ip addr\`, \`ip route\`, \`ping\`.
- **Transport layer** — **TCP** or **UDP** segments between *ports* on two hosts. Evidence: \`ss\`, connection errors.
- **Application layer** — HTTP, DNS, SSH, TLS. Evidence: \`curl\`, \`dig\`, \`openssl s_client\`.

**IPv4** addresses are 32 bits written as four decimal octets. An address alone is meaningless without its **prefix length** — the CIDR suffix such as \`/24\`. The prefix says how many leading bits identify the *network*; the remaining bits identify the *host*. \`192.168.10.77/26\` means 26 network bits and 6 host bits: 2^6 = 64 addresses per subnet, of which 62 are usable (the all-zeros **network address** and all-ones **broadcast address** are reserved). The /26 blocks inside \`192.168.10.0/24\` start at .0, .64, .128 and .192, so .77 lives in \`192.168.10.64/26\` with broadcast \`192.168.10.127\`.

Ranges you must recognise: **RFC 1918 private** \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`; **loopback** \`127.0.0.0/8\`; **link-local** \`169.254.0.0/16\` (an address here usually means DHCP failed somewhere); documentation ranges \`192.0.2.0/24\`, \`198.51.100.0/24\`, \`203.0.113.0/24\`.

**IPv6** addresses are 128 bits written as eight groups of hex, with leading zeros dropped and one run of zero groups compressed to \`::\`. Subnets are almost always **/64**. Every IPv6 interface has a **link-local** address in \`fe80::/10\` (used for neighbour discovery and routing next hops) plus zero or more global addresses (\`2000::/3\`) or unique local addresses (\`fd00::/8\`). Loopback is \`::1\`; documentation is \`2001:db8::/32\`. IPv6 has no broadcast; it uses multicast.

**The forwarding decision** is the most important consequence of CIDR. When a host sends a packet it compares the destination with its own connected prefixes. Same subnet: deliver directly using the destination MAC (learned via ARP or IPv6 neighbour discovery). Different subnet: send the frame to the MAC of a **gateway** chosen from the routing table. A wrong prefix length therefore causes very specific failures: a /16 typed as /24 makes the host try to reach the gateway for neighbours it should talk to directly (or vice versa).

> Always record addresses as address/prefix. "10.20.30.40 with the usual mask" has caused more outages than most bugs.`,
          internals: `The kernel stores addresses per interface and automatically installs a **connected route** (\`proto kernel scope link\`) for each prefix — that is how it knows which destinations are on-link. \`ip -j addr\` exposes the same data as JSON for scripts.

For IPv6 the kernel also creates the fe80:: link-local address when the link comes up and, unless disabled, performs **SLAAC**: it listens for Router Advertisements (ICMPv6 type 134) and builds a global address from the advertised /64 prefix. **Duplicate Address Detection** marks new addresses \`tentative\` until no other host claims them; a duplicate shows as \`dadfailed\`.

Packets are built top-down (application data, TCP/UDP header, IP header, Ethernet header) and parsed bottom-up on receipt. A frame whose destination MAC is not ours is dropped by the NIC before IP ever sees it, which is why ARP problems look like "the network is dead" even when routing is perfect.`,
          useCases: [
            'Planning a /26 or /27 subnet for a new application tier and documenting usable ranges for the IPAM system',
            'Spotting a host that fell back to a 169.254.x.x address because DHCP failed on a provisioning VLAN',
            'Explaining why two servers with addresses 10.1.4.10/24 and 10.1.5.10/24 cannot talk without a router',
            'Adding IPv6 to a dual-stack service and recognising link-local vs global addresses in ip output'
          ],
          syntax: 'ip -br addr\nip addr show dev IFACE\nip -6 addr show\nipcalc -n -b ADDRESS/PREFIX',
          options: [
            ['-br', 'Brief one-line-per-interface output from ip'],
            ['-4 / -6', 'Restrict ip output to IPv4 or IPv6'],
            ['-j', 'JSON output from ip, ideal for scripts'],
            ['ipcalc -n', 'Print the network address for an address/prefix (RHEL ipcalc package)'],
            ['ipcalc -b', 'Print the broadcast address'],
            ['ipcalc -p', 'Print the prefix length for an address and netmask']
          ],
          examples: [
            {
              title: 'Brief view of all addresses',
              cmd: 'ip -br addr',
              out: 'lo               UNKNOWN        127.0.0.1/8 ::1/128\nens192           UP             10.20.30.41/24 2001:db8:20::41/64 fe80::250:56ff:fe8a:1c07/64\nens224           DOWN',
              fields: [
                ['UNKNOWN (lo)', 'Normal for loopback; it has no carrier concept'],
                ['10.20.30.41/24', 'IPv4 address with prefix: network 10.20.30.0, broadcast 10.20.30.255'],
                ['2001:db8:20::41/64', 'Global (here documentation-range) IPv6 address in a /64'],
                ['fe80::...', 'Automatically created IPv6 link-local address'],
                ['DOWN', 'Interface administratively down or no carrier; no addresses usable']
              ]
            },
            {
              title: 'Calculate subnet boundaries',
              cmd: 'ipcalc -n -b 192.168.10.77/26',
              out: 'NETWORK=192.168.10.64\nBROADCAST=192.168.10.127',
              fields: [['NETWORK', 'First address of the /26 block'], ['BROADCAST', 'Last address of the block; usable hosts are .65 to .126']],
              note: 'Debian/Ubuntu ship a different ipcalc with a table-style output; the arithmetic is the same.'
            }
          ],
          walkthrough: [
            'Run `ip -br addr` and list each interface, its state and every address with prefix.',
            'For each IPv4 address, work out the network and broadcast addresses by hand, then confirm with `ipcalc -n -b`.',
            'Run `ip route` and match the `proto kernel scope link` routes to the prefixes you calculated.',
            'Run `ip -6 addr` and classify every address as link-local (fe80::), global, ULA (fd..) or loopback.',
            'Pick a colleague server address and decide, from your prefix alone, whether traffic to it goes direct or via the gateway; confirm with `ip route get ADDRESS`.'
          ],
          lab: {
            goal: 'Practise address/prefix reasoning on a real host and prove your calculations against the kernel.',
            steps: [
              'On a RHEL 9/10 VM run `ip -br addr` and `ip route` and save the output to `~/net-baseline.txt` for later lessons.',
              'Install the calculator if missing: `sudo dnf install -y ipcalc`.',
              'Calculate by hand then verify: `ipcalc -n -b 172.16.45.200/21` and `ipcalc -n -b 10.0.0.130/25`.',
              'Run `ip route get 8.8.8.8` and `ip route get <an address in your own subnet>` and compare the output (via gateway vs direct).',
              'List IPv6 addresses with `ip -6 addr show scope link` and `ip -6 addr show scope global`.'
            ],
            verify: '172.16.45.200/21 gives NETWORK=172.16.40.0 BROADCAST=172.16.47.255; 10.0.0.130/25 gives 10.0.0.128 and 10.0.0.255. `ip route get` to an on-link address shows no `via`; to 8.8.8.8 it shows `via <gateway>`.'
          },
          troubleshooting: {
            scenario: 'A newly built server can reach its gateway but not a database at 10.40.8.25, while a neighbouring server in the same rack can.',
            steps: [
              'Evidence: `ip -br addr` shows `10.40.9.14/24`; the working neighbour shows `10.40.9.15/22`. `ip route get 10.40.8.25` on the broken host shows `via 10.40.9.1`.',
              'Hypothesis: the build used /24 instead of the site standard /22, so 10.40.8.25 is treated as off-link and sent to a gateway that does not route back into the same /22.',
              'Fix: correct the prefix in the connection profile (`nmcli connection modify ens192 ipv4.addresses 10.40.9.14/22` then `nmcli connection up ens192`) during a window, with console access.',
              'Validate: `ip route get 10.40.8.25` now shows `dev ens192` without `via`, and the database port answers.'
            ]
          },
          mistakes: [
            'Recording or configuring an address without its prefix length; the network boundary is half of the configuration.',
            'Counting network and broadcast addresses as usable hosts when sizing a subnet.',
            'Treating a 169.254.x.x address as a valid configuration rather than a DHCP failure indicator.',
            'Assuming IPv6 is "not in use" while services listen on [::] and clients prefer AAAA records.'
          ],
          safety: [
            'Reading addresses and routes needs no privileges; changing them requires root and can cut remote sessions, so have console access.',
            'Never "test" an address by assigning it on a production segment; you may create a duplicate address and take down another host.'
          ],
          distro: 'The ip command (iproute2) is identical across RHEL 8/9/10, Debian and Ubuntu; ifconfig/net-tools is deprecated and not installed by default on RHEL. The RHEL ipcalc package prints KEY=value lines; Debian ipcalc is a different program with a different output format.',
          challenge: {
            task: 'You are given 10.60.0.0/24 for four application tiers that each need at most 50 hosts. Propose the subnets, then state the gateway (first usable) and broadcast for each.',
            solution: `50 hosts need 6 host bits (62 usable), so each tier gets a **/26** and four /26 blocks fit exactly in a /24:

\`\`\`
10.60.0.0/26    gw 10.60.0.1    bcast 10.60.0.63
10.60.0.64/26   gw 10.60.0.65   bcast 10.60.0.127
10.60.0.128/26  gw 10.60.0.129  bcast 10.60.0.191
10.60.0.192/26  gw 10.60.0.193  bcast 10.60.0.255
\`\`\`

Verify any block with \`ipcalc -n -b 10.60.0.130/26\`. A /27 (30 usable) would be too small, so /26 is the smallest prefix that meets the requirement.`
          },
          interview: [
            { q: 'What does the /24 in 10.1.2.3/24 mean and why does it matter?', a: 'It is the prefix length: the first 24 bits are the network, the last 8 the host. It decides which destinations the host treats as on-link (delivered directly via ARP) and which are sent to a gateway, and it defines the network and broadcast addresses.', mistake: 'Saying it is "just the subnet mask" without explaining the forwarding consequence.', followUp: 'What happens if a host has /24 but its neighbours use /22?' },
            { q: 'How many usable hosts are in a /27 and a /64?', a: 'A /27 has 32 addresses and 30 usable IPv4 hosts. A /64 has 2^64 addresses; IPv6 has no broadcast, and /64 is the standard subnet size because SLAAC expects it.', mistake: 'Forgetting to subtract network and broadcast for IPv4.', followUp: 'Which IPv6 address does every interface get even without a router?' },
            { q: 'A server shows an address of 169.254.12.7. What does that tell you?', a: 'It is an IPv4 link-local (APIPA) address, assigned when no DHCP lease was obtained and something is configured to self-assign. Investigate DHCP reachability, VLAN tagging or the connection profile rather than using the address.', mistake: 'Treating it as a normal private address.', followUp: 'Which command shows the DHCP options NetworkManager received?' }
          ],
          revision: [
            'Diagnose bottom-up: link (ip link) -> IP (ip addr/route) -> transport (ss) -> application (curl/dig).',
            'Usable IPv4 hosts = 2^(32 - prefix) - 2; /24=254, /25=126, /26=62, /27=30.',
            'Private: 10/8, 172.16/12, 192.168/16. Link-local: 169.254/16 and fe80::/10. Loopback: 127/8 and ::1.',
            'IPv6 subnets are /64; every interface has an fe80:: link-local address.',
            'Same subnet = direct delivery via ARP/NDP; different subnet = via gateway from the routing table.'
          ]
        },
        {
          id: 'L10-M1-T2',
          title: 'TCP vs UDP, ports and sockets',
          minutes: 40,
          objectives: [
            'Contrast TCP and UDP delivery guarantees and choose which protocol a service uses',
            'Describe the TCP three-way handshake and the meaning of LISTEN, ESTABLISHED, TIME-WAIT and CLOSE-WAIT',
            'Explain well-known, registered and ephemeral ports and how a socket is identified',
            'Relate a listening address (0.0.0.0, 127.0.0.1, [::]) to who can connect'
          ],
          prereqs: ['L10-M1-T1'],
          concept: `IP moves packets between hosts. The **transport layer** moves data between *programs* on those hosts, identified by **port numbers** (0-65535).

**TCP** (Transmission Control Protocol) is connection-oriented and reliable. Before data flows, the client and server perform the **three-way handshake**: the client sends **SYN**, the server replies **SYN-ACK**, the client answers **ACK**. TCP then numbers every byte, retransmits lost segments, delivers data in order and applies flow and congestion control. Connections end with FIN/ACK exchanges, or abruptly with **RST** (reset). SSH, HTTP/HTTPS, SMTP, databases and LDAP use TCP.

**UDP** (User Datagram Protocol) is connectionless: each datagram is sent independently, with no handshake, no retransmission and no ordering. It is cheaper and lower-latency, and the application handles loss if it cares. DNS queries (port 53, falling back to TCP for large replies and zone transfers), DHCP (67/68), NTP/chrony (123), syslog (514) and SNMP (161) use UDP. A practical consequence: you cannot "connect" to a UDP port to prove it is open; silence may mean open, filtered or the service ignoring malformed input.

**Ports**: 0-1023 are *well-known/privileged* — binding them needs root or the \`CAP_NET_BIND_SERVICE\` capability. 1024-49151 are *registered* (8080, 3306, 5432). Clients use **ephemeral** source ports chosen by the kernel from \`net.ipv4.ip_local_port_range\` (default 32768-60999 on RHEL). \`/etc/services\` maps names to numbers so tools can print \`ssh\` instead of 22.

A **socket** is the kernel endpoint a program uses. A TCP connection is uniquely identified by the **5-tuple**: protocol, source IP, source port, destination IP, destination port. A server has one **listening** socket and one additional socket per accepted connection.

The **bind address** controls reachability: a service listening on \`127.0.0.1:8080\` is reachable only from the same host; \`0.0.0.0:8080\` accepts IPv4 on every address; \`[::]:8080\` accepts IPv6 (and usually IPv4-mapped connections too, unless \`IPV6_V6ONLY\` is set); a specific address such as \`10.20.30.41:8080\` accepts only on that address. "It works with curl localhost but not from the other server" is very often a loopback-only bind.

Key TCP states you will see in \`ss\`: **LISTEN** (waiting for connections), **SYN-SENT** (client waiting for SYN-ACK — many of these mean the far side is not answering), **ESTABLISHED**, **TIME-WAIT** (the side that closed first waits ~60 s so stray packets die; large numbers are normal on busy clients), **CLOSE-WAIT** (the peer closed but *our application* has not called close() — a growing count indicates an application bug, not a network problem).`,
          internals: `When a SYN arrives for a listening socket, the kernel completes the handshake itself and places the connection on the socket's **accept queue**; the application later calls accept(). For a listening socket, \`ss\` shows the current accept-queue length in **Recv-Q** and the configured backlog in **Send-Q**. A Recv-Q that stays near Send-Q means the application is not accepting fast enough and new SYNs will be dropped.

If no socket listens on the destination port, the kernel answers a TCP SYN with **RST** (the client sees *Connection refused*) and a UDP datagram with **ICMP port unreachable**. Socket information lives in the kernel and is exported through the **sock_diag netlink** interface that \`ss\` queries; legacy \`netstat\` parsed the slower text files under \`/proc/net/\`.`,
          useCases: [
            'Explaining to an application team why their health check that only opens TCP 53 does not prove DNS over UDP works',
            'Finding why a Java service works locally but not remotely: it binds 127.0.0.1 by default',
            'Diagnosing a connection leak from thousands of CLOSE-WAIT sockets on an application server',
            'Choosing a port above 1024 for a non-root service, or granting CAP_NET_BIND_SERVICE in its unit file'
          ],
          syntax: 'ss -tln\nss -uln\nss -tan state established\ngetent services PORT|NAME\nsysctl net.ipv4.ip_local_port_range',
          options: [
            ['-t / -u', 'TCP / UDP sockets'],
            ['-l', 'Listening sockets only'],
            ['-n', 'Numeric addresses and ports (no name lookups)'],
            ['-a', 'All sockets, listening and non-listening'],
            ['state STATE', 'Filter by TCP state (established, time-wait, close-wait, syn-sent ...)'],
            ['-s', 'Summary counts per protocol and state']
          ],
          examples: [
            {
              title: 'Listening TCP sockets and their bind addresses',
              cmd: 'ss -tln',
              out: 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port\nLISTEN  0       128            0.0.0.0:22          0.0.0.0:*\nLISTEN  0       4096         127.0.0.1:8080        0.0.0.0:*\nLISTEN  0       511                  *:443               *:*\nLISTEN  0       128               [::]:22             [::]:*',
              fields: [
                ['0.0.0.0:22', 'sshd accepts IPv4 on all addresses'],
                ['127.0.0.1:8080', 'Loopback only: remote clients get Connection refused'],
                ['*:443', 'Wildcard on both IPv4 and IPv6 (dual-stack socket)'],
                ['Recv-Q / Send-Q on LISTEN', 'Current accept-queue length / configured backlog']
              ]
            },
            {
              title: 'Count sockets by state',
              cmd: 'ss -tan | awk \'NR>1 {print $1}\' | sort | uniq -c',
              out: '    412 ESTAB\n      9 LISTEN\n   2210 CLOSE-WAIT\n    130 TIME-WAIT',
              fields: [['CLOSE-WAIT 2210', 'Peers closed but the local application never closed its sockets: an application leak'], ['TIME-WAIT', 'Normal after actively closed connections']],
              note: 'CLOSE-WAIT is fixed in the application (or by restarting it as a stop-gap), not with kernel tuning.'
            }
          ],
          walkthrough: [
            'Run `ss -tln` and `ss -uln` and identify the service behind each port with `getent services 22` or `ss -tlnp` as root.',
            'Open an SSH session to the host from another machine, then run `ss -tan state established \'( sport = :22 )\'` to see the 5-tuple of your own connection.',
            'Start a loopback-only listener: `python3 -m http.server 8000 --bind 127.0.0.1 &` and test with `curl -I http://127.0.0.1:8000` locally.',
            'Try the same URL from another host and observe the failure; then explain it from the `ss -tln` output.',
            'Stop the listener with `kill %1` and run `ss -s` to see the summary counts.'
          ],
          lab: {
            goal: 'Observe sockets, bind addresses and TCP states directly on a RHEL host.',
            steps: [
              'Show the ephemeral port range: `sysctl net.ipv4.ip_local_port_range`.',
              'Start two listeners in a scratch terminal: `python3 -m http.server 8001 --bind 127.0.0.1 &` and `python3 -m http.server 8002 &`.',
              'Run `ss -tln \'( sport = :8001 or sport = :8002 )\'` and record each bind address.',
              'From the host run `curl -s -o /dev/null -w "%{http_code}\\n" http://127.0.0.1:8002/`, then immediately `ss -tan state time-wait` to see the TIME-WAIT entry.',
              'Look up names: `getent services 123/udp` and `getent services https`.',
              'Clean up with `kill %1 %2`.'
            ],
            verify: '`ss -tln` shows 127.0.0.1:8001 and 0.0.0.0:8002 (or *:8002). The curl prints 200 and a TIME-WAIT socket appears for port 8002. getent prints `ntp 123/udp` and `https 443/tcp`.'
          },
          troubleshooting: {
            scenario: 'An API server becomes unresponsive every few days; restarting the service fixes it. Monitoring shows open file descriptors climbing steadily.',
            steps: [
              'Evidence: `ss -tan state close-wait | wc -l` returns several thousand, all with the local port of the API to a database peer.',
              'Hypothesis: the database closes idle connections, but the application never closes its side, leaking sockets and file descriptors until it hits its limit.',
              'Fix: raise the issue with the application team (connection-pool idle timeout / close handling); as a temporary mitigation schedule a controlled restart and monitor.',
              'Validate: after the fix the CLOSE-WAIT count stays low over several days (`ss -tan state close-wait | wc -l` trended in monitoring).'
            ]
          },
          mistakes: [
            'Concluding a UDP service is down because a TCP port test to it fails, or "open" because a UDP probe got no reply.',
            'Blaming the network for CLOSE-WAIT build-up; it is the local application not closing sockets.',
            'Trying to "fix" TIME-WAIT counts with unsafe kernel tweaks when they are normal behaviour.',
            'Binding a service to 127.0.0.1 and then opening the firewall, expecting remote access.'
          ],
          safety: [
            'Listing sockets is unprivileged, but process names (-p) for other users require root.',
            'Binding privileged ports requires root or CAP_NET_BIND_SERVICE; prefer granting the capability in the unit file to running the whole service as root.'
          ],
          distro: 'TCP/UDP behaviour and ss output are identical on RHEL 8/9/10 and Debian/Ubuntu. netstat (net-tools) is deprecated and not installed by default on RHEL 8+. The default ephemeral range 32768-60999 is the upstream kernel default on all of them.',
          challenge: {
            task: 'A team says "port 8443 is open, I can curl it from the box, but the load balancer health check fails". Give the exact commands you would run on the server to prove or disprove a bind-address problem, and the fix if it is one.',
            solution: `Check what address the listener is bound to:

\`\`\`
sudo ss -tlnp 'sport = :8443'
\`\`\`

If the Local Address is \`127.0.0.1:8443\`, only local clients can connect; remote clients receive a TCP RST (Connection refused). Confirm from another host with \`curl -kv https://SERVER:8443/\`.

Fix it in the **application** configuration (for example \`server.address=0.0.0.0\` or the specific service IP), restart the service, and re-check \`ss\` shows \`0.0.0.0:8443\`, \`*:8443\` or the service address. Only then check the firewall (next lessons) — opening a firewall port cannot help a loopback-only listener.`
          },
          interview: [
            { q: 'Explain the TCP three-way handshake and what a client sees if nothing listens on the port.', a: 'Client sends SYN, server replies SYN-ACK, client sends ACK; then data flows. If no socket listens, the server kernel replies with RST and the client reports "Connection refused" immediately.', mistake: 'Saying the client would time out.', followUp: 'What would the client see if a firewall silently dropped the SYN?' },
            { q: 'What is the difference between TIME-WAIT and CLOSE-WAIT?', a: 'TIME-WAIT is on the side that closed first and is normal; it lasts about 60 seconds. CLOSE-WAIT means the remote side closed and the local application has not closed its socket yet; a large, growing number points to an application bug.', mistake: 'Treating both as network problems that need sysctl tuning.', followUp: 'How would you find which process owns the CLOSE-WAIT sockets?' },
            { q: 'Why can you not reliably test a UDP port with a connect-style probe?', a: 'UDP has no handshake. A closed port may trigger ICMP port unreachable, but an open or filtered port often produces silence. Test UDP services with a real protocol request such as dig for DNS or chronyc for NTP.', mistake: 'Assuming no reply means the port is open.', followUp: 'Which DNS operations switch from UDP to TCP?' }
          ],
          revision: [
            'TCP = handshake, reliable, ordered; UDP = connectionless datagrams, no retransmission.',
            'SYN -> SYN-ACK -> ACK; no listener = RST = Connection refused.',
            'Ports < 1024 need root or CAP_NET_BIND_SERVICE; clients use ephemeral ports 32768-60999.',
            'A connection is identified by the 5-tuple (protocol, src IP, src port, dst IP, dst port).',
            '127.0.0.1 bind = local only; 0.0.0.0 / [::] / * = all addresses.',
            'CLOSE-WAIT growth = application not closing sockets; TIME-WAIT is normal.'
          ]
        }
      ]
    },
    {
      id: 'L10-M2', title: 'Interface configuration',
      summary: 'Inspect links and addresses with ip and nmcli, understand devices versus connection profiles, and build persistent static IPv4/IPv6 configurations and hostnames on RHEL 8, 9 and 10.',
      lessons: [
        {
          id: 'L10-M2-T1',
          title: 'Inspecting interfaces: ip, NetworkManager devices and connection profiles',
          minutes: 40,
          objectives: [
            'Read link state, MAC address, MTU and counters with ip link and ip -s link',
            'Distinguish a NetworkManager device from a connection profile and read nmcli device and connection output',
            'Explain why ip changes are runtime-only while nmcli connection changes persist',
            'Bring connection profiles up and down safely'
          ],
          prereqs: ['L10-M1-T1'],
          concept: `On RHEL 8, 9 and 10, networking is managed by **NetworkManager** (\`NetworkManager.service\`). Two tools look at the network from different angles:

- **ip** (iproute2) talks directly to the kernel. It shows and changes the *current* state: links, addresses, routes, neighbours. Anything you change with \`ip addr add\` or \`ip route add\` is **runtime only**; it is lost on reboot, and NetworkManager may overwrite it when it reapplies a profile.
- **nmcli** talks to NetworkManager, which owns *persistent* configuration and pushes it into the kernel.

NetworkManager separates two concepts that beginners mix up:

- A **device** is a network interface the kernel knows about (\`ens192\`, \`eth0\`, \`bond0\`, \`lo\`). \`nmcli device status\` lists devices, their type, their state (\`connected\`, \`disconnected\`, \`unavailable\` — usually no carrier — or \`unmanaged\`) and the connection currently active on them.
- A **connection** (connection profile) is a saved set of settings — addressing method, addresses, gateway, DNS, MTU, routes — that can be *activated* on a device. \`nmcli connection show\` lists profiles; \`--active\` limits to those in use. A device can have several profiles (for example "office" and "lab") but only one active at a time, and a profile name does **not** have to match the device name (the installer often names it after the interface; cloud images often use "System eth0" or "cloud-init eth0").

Modifying a profile with \`nmcli connection modify\` changes the stored settings only. They take effect when the profile is (re)activated: \`nmcli connection up NAME\` (or \`nmcli device reapply DEV\`, which applies most changes without a full down/up).

**Interface names**: RHEL uses *predictable network interface names* derived from firmware/topology: \`eno1\` (onboard), \`ens192\` (hot-plug slot), \`enp3s0\` (PCI bus/slot), \`wlp2s0\` (wireless). This keeps names stable when hardware is added. \`eth0\` appears on many virtual and cloud images that disable this scheme.

Link-level facts you read from \`ip link\`: \`UP\` means administratively up; \`LOWER_UP\` means the physical layer has carrier; \`NO-CARRIER\` means a cable, switch port or virtual NIC is disconnected; \`mtu 1500\` is the maximum packet size; \`link/ether\` is the MAC. \`ip -s link\` adds RX/TX packet, error and drop counters — rising errors suggest cabling, duplex or driver issues; rising drops suggest buffers or filtering.

> Rule of thumb: inspect with \`ip\`, configure with \`nmcli\` (or \`nmtui\` interactively). If you fix something with \`ip\` during an incident, write it into the profile afterwards or it will vanish at the next reboot.`,
          internals: `NetworkManager loads connection profiles from disk at startup, listens to the kernel over **netlink** for link changes (carrier up/down, new devices) and applies the matching profile. Profiles are matched to devices by \`connection.interface-name\` or by MAC address, and auto-activated when \`connection.autoconnect yes\`.

Devices can be **unmanaged** — for example interfaces listed in \`/etc/NetworkManager/conf.d/*.conf\` with \`unmanaged-devices=\`, or veth interfaces created by container runtimes — and NetworkManager will then leave them alone. \`nmcli general status\` shows overall state and connectivity; \`nmcli -f all device show DEV\` shows everything NetworkManager knows, including DHCP options and the IP configuration it applied. Logs go to the journal: \`journalctl -u NetworkManager\`.`,
          useCases: [
            'Proving to a network team that a server port has no carrier (NO-CARRIER / unavailable) before they check the switch',
            'Finding which of several saved profiles is actually active on a multi-homed host',
            'Applying a DNS change to a production interface with nmcli device reapply instead of bouncing the link',
            'Spotting rising RX errors on a NIC that correlate with application timeouts'
          ],
          syntax: 'ip link show [dev IFACE]\nip -s link show dev IFACE\nnmcli device status\nnmcli connection show [--active]\nnmcli connection show NAME\nnmcli connection up|down NAME\nnmcli device reapply IFACE',
          options: [
            ['nmcli -t', 'Terse, colon-separated output for scripts'],
            ['nmcli -f FIELDS', 'Select fields, e.g. -f GENERAL.STATE,IP4.ADDRESS'],
            ['nmcli -g FIELD', 'Print only the values of the given fields'],
            ['connection show --active', 'Only profiles currently active'],
            ['ip -s link', 'Include RX/TX statistics (errors, drops, overruns)'],
            ['nmcli device reapply', 'Apply modified profile settings to the device without full deactivation']
          ],
          examples: [
            {
              title: 'Devices and the profiles active on them',
              cmd: 'nmcli device status',
              out: 'DEVICE  TYPE      STATE                   CONNECTION\nens192  ethernet  connected               ens192\nens224  ethernet  unavailable             --\nlo      loopback  connected (externally)  lo',
              fields: [
                ['connected / ens192', 'Device ens192 has the profile named ens192 active'],
                ['unavailable', 'Device exists but cannot be activated, typically no carrier'],
                ['connected (externally)', 'Configured outside NetworkManager; NM only observes it']
              ]
            },
            {
              title: 'Link state and counters',
              cmd: 'ip -s link show dev ens192',
              out: '2: ens192: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP mode DEFAULT group default qlen 1000\n    link/ether 00:50:56:8a:1c:07 brd ff:ff:ff:ff:ff:ff\n    RX:  bytes  packets errors dropped  missed   mcast\n    9876543210  8123456      0     112       0    3410\n    TX:  bytes  packets errors dropped carrier collsns\n    5432109876  6012345      0       0       0       0',
              fields: [
                ['UP,LOWER_UP', 'Administratively up and carrier present'],
                ['mtu 1500', 'Maximum transmission unit for this link'],
                ['RX errors 0 / dropped 112', 'No corrupt frames; some packets dropped by the stack (often unknown protocols or filtering), worth trending'],
                ['link/ether', 'MAC address of the interface']
              ]
            },
            {
              title: 'Saved profiles',
              cmd: 'nmcli connection show',
              out: 'NAME    UUID                                  TYPE      DEVICE\nens192  7d1f2c4e-3b9a-4f8e-9c11-2a6b5d0e9f13  ethernet  ens192\nlo      0b3a6e21-9d77-4c55-a1c2-5f0e8d7b6a40  loopback  lo\nlab-dhcp 4c8e9a12-6f3b-41d7-8e25-91b0c3d4e5f6 ethernet  --',
              fields: [['DEVICE --', 'Profile lab-dhcp is saved but not active'], ['UUID', 'Stable identifier; names can be changed']]
            }
          ],
          walkthrough: [
            'Run `ip -br link` and `ip link show` and note UP/LOWER_UP, MTU and MAC for each interface.',
            'Run `nmcli device status` and `nmcli connection show` and match each device to its active profile.',
            'Inspect one profile in full: `nmcli connection show ens192 | grep -E "ipv4|ipv6|connection.id|autoconnect"`.',
            'Add a temporary address with `sudo ip addr add 192.0.2.250/32 dev ens192`, confirm with `ip -br addr`, then run `sudo nmcli connection up ens192` (console recommended) and observe it disappear.',
            'Read NetworkManager activity in `journalctl -u NetworkManager --since "-10min"`.'
          ],
          lab: {
            goal: 'Demonstrate the difference between runtime (ip) and persistent (nmcli) state and identify devices versus profiles.',
            steps: [
              'Record `nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status`.',
              'If the VM has a spare NIC, check its state; otherwise use your primary profile carefully from the console.',
              'Add a runtime-only address: `sudo ip addr add 192.0.2.99/24 dev ens192` and verify it in `ip -br addr`.',
              'Reactivate the profile: `sudo nmcli connection up ens192` and check the address is gone.',
              'Show what NetworkManager applied: `nmcli -f IP4,IP6 device show ens192`.',
              'Show counters: `ip -s link show dev ens192` and note errors/drops.'
            ],
            verify: 'The 192.0.2.99 address appears after `ip addr add` and is absent after `nmcli connection up`. `nmcli device status` shows the device `connected` to the expected profile.'
          },
          troubleshooting: {
            scenario: 'After a hypervisor migration, a VM has no network. `ip -br addr` shows ens192 DOWN with no address.',
            steps: [
              'Evidence: `ip link show ens192` shows `NO-CARRIER`; `nmcli device status` reports `unavailable`.',
              'Hypothesis: the virtual NIC is disconnected or attached to the wrong port group/VLAN on the new host; the guest configuration is not at fault.',
              'Fix: ask the virtualisation team to connect the vNIC to the correct network (or connect it in the hypervisor console). No guest changes are needed.',
              'Validate: `ip link` shows LOWER_UP, `nmcli device status` shows connected, and `ping -c3 <gateway>` succeeds.'
            ]
          },
          mistakes: [
            'Fixing an address or route with ip during an incident and never persisting it, so the outage returns after the next reboot.',
            'Assuming the connection profile name equals the device name and modifying the wrong profile.',
            'Running nmcli connection modify and expecting it to take effect without up or reapply.',
            'Using ifconfig output as evidence on RHEL; it is deprecated, often absent, and hides secondary addresses.'
          ],
          safety: [
            'nmcli connection down/up on the interface carrying your SSH session will drop it; use the console or schedule a delayed rollback.',
            'Changes to network profiles require root (or polkit authorisation); inspection does not.',
            'Before editing a production profile, save it: `nmcli connection show NAME > /root/NAME.before` or copy the keyfile.'
          ],
          distro: 'RHEL 8/9/10 all use NetworkManager. Debian/Ubuntu servers often use ifupdown (/etc/network/interfaces) or netplan with systemd-networkd, so nmcli may not manage interfaces there. The legacy network-scripts package (ifup/ifdown scripts) was deprecated in RHEL 8 and removed in RHEL 9.',
          challenge: {
            task: 'A host has two NICs and three saved profiles. Write the commands to (1) show which profile is active on which NIC, (2) show the IPv4 settings stored in a profile versus what is actually applied, and (3) explain any difference.',
            solution: `\`\`\`
nmcli -f NAME,DEVICE,ACTIVE connection show
nmcli -g ipv4.method,ipv4.addresses,ipv4.gateway connection show ens192   # stored settings
nmcli -f IP4 device show ens192                                           # applied state
ip -4 addr show dev ens192                                               # kernel view
\`\`\`

The **profile** (\`ipv4.*\` properties) is what will be applied next time it is activated. \`IP4.*\` in device show and \`ip addr\` show what is live now. A difference means either the profile was modified and not reactivated (fix: \`nmcli connection up\` or \`nmcli device reapply\`), or someone added runtime state with \`ip\` that is not in the profile (fix: persist it with nmcli or remove it).`
          },
          interview: [
            { q: 'What is the difference between a NetworkManager device and a connection?', a: 'A device is an actual interface (ens192). A connection is a saved profile of settings that can be activated on a device. One device can have several profiles but one active at a time, and profile names need not match device names.', mistake: 'Using the two terms interchangeably.', followUp: 'How do you see which profile is active on a device?' },
            { q: 'You added a route with ip route add and it vanished after a reboot. Why?', a: 'ip changes the kernel runtime state only. Persistent configuration lives in the NetworkManager profile, so the route must be added with nmcli connection modify (+ipv4.routes) and the profile reactivated.', mistake: 'Suggesting rc.local scripts as the fix.', followUp: 'What property holds static routes in a profile?' },
            { q: 'What does NO-CARRIER on an interface tell you?', a: 'The link layer has no physical/virtual connection: cable unplugged, switch port down, or vNIC disconnected. IP configuration is irrelevant until carrier returns.', mistake: 'Starting to change IP settings.', followUp: 'Which nmcli device state corresponds to no carrier?' }
          ],
          revision: [
            'ip = kernel runtime view (non-persistent); nmcli = NetworkManager persistent config.',
            'Device = interface; connection = saved profile activated on a device.',
            'nmcli connection modify changes the profile; apply with connection up or device reapply.',
            'UP = admin up; LOWER_UP = carrier; NO-CARRIER = physical/virtual link problem.',
            'ip -s link shows errors and drops; trend them.'
          ]
        },
        {
          id: 'L10-M2-T2',
          title: 'Persistent static IPv4/IPv6 profiles, keyfiles vs ifcfg, and hostname',
          minutes: 50,
          objectives: [
            'Create and modify static IPv4 and IPv6 connection profiles with nmcli',
            'Locate profile storage: keyfiles on RHEL 9/10 and ifcfg files on RHEL 8, and migrate between them',
            'Set the static hostname with hostnamectl and verify name resolution of the host itself',
            'Apply network changes safely on remote systems with validation and rollback'
          ],
          prereqs: ['L10-M2-T1'],
          concept: `A static configuration is a set of profile **properties**. The ones you will use constantly:

- \`ipv4.method\` — \`auto\` (DHCP), \`manual\` (static), \`disabled\`, \`link-local\`.
- \`ipv4.addresses\` — one or more \`ADDRESS/PREFIX\` values (comma-separated).
- \`ipv4.gateway\` — default gateway.
- \`ipv4.dns\` and \`ipv4.dns-search\` — name servers and search domains.
- \`ipv4.ignore-auto-dns yes\` — keep DHCP addressing but ignore DHCP-supplied DNS.
- \`ipv6.method\` — \`auto\` (SLAAC/DHCPv6 per router advertisement), \`dhcp\`, \`manual\`, \`disabled\`, \`ignore\`; and the matching \`ipv6.addresses\`, \`ipv6.gateway\`, \`ipv6.dns\`.
- \`connection.autoconnect yes\` — activate at boot.

Properties are set with \`nmcli connection modify NAME prop value ...\`. Prefixing a multi-value property with \`+\` or \`-\` adds or removes one value (\`+ipv4.addresses 10.0.0.12/24\`) instead of replacing the list. \`nmcli connection add\` creates a new profile. Changes take effect on \`nmcli connection up NAME\`.

**Where profiles live** depends on the release:

- **RHEL 8**: NetworkManager stores profiles by default in the legacy **ifcfg** format, \`/etc/sysconfig/network-scripts/ifcfg-NAME\` (plus \`route-NAME\` for static routes), via the ifcfg-rh plugin.
- **RHEL 9**: new profiles are stored as **keyfiles**, \`/etc/NetworkManager/system-connections/NAME.nmconnection\` (INI format). Existing ifcfg files are still read, but the format is deprecated.
- **RHEL 10**: ifcfg support is removed; profiles must be keyfiles. Migrate before upgrading with \`nmcli connection migrate\` (available on recent RHEL 9 releases).

Keyfiles must be owned by root with mode **0600** (they can contain secrets such as Wi-Fi or 802.1X passwords); NetworkManager ignores files with looser permissions. If you edit a keyfile or ifcfg file by hand, run \`nmcli connection reload\` and then \`nmcli connection up NAME\`. Using nmcli is preferred because it validates the values.

**Hostname**: the *static* hostname is stored in \`/etc/hostname\` and set with \`hostnamectl set-hostname server1.example.com\`. There is also a *transient* hostname (may come from DHCP/kernel) and an optional *pretty* name. \`hostnamectl\` (or \`hostnamectl status\`) shows them all. Setting the hostname does not create DNS records; make sure the name resolves (DNS or \`/etc/hosts\`) because many services (Kerberos, mail, clustering) need forward and reverse resolution to match.

> RHCSA tasks typically say "configure IPv4 and IPv6 addresses ... persistently" and "set the hostname". Use nmcli + hostnamectl and verify after a reboot.`,
          internals: `NetworkManager loads profiles through **settings plugins** listed in \`/etc/NetworkManager/NetworkManager.conf\` (\`plugins=keyfile,ifcfg-rh\` on RHEL 8 and 9; RHEL 9 writes new profiles with the first plugin, keyfile). \`nmcli -f NAME,FILENAME connection show\` shows the file backing each profile.

On activation NetworkManager pushes addresses and routes to the kernel over netlink, writes DNS into its internal resolver configuration and regenerates \`/etc/resolv.conf\` (unless configured otherwise). IPv6 \`auto\` waits for Router Advertisements; with \`manual\` it still configures the fe80:: link-local address. \`hostnamectl\` talks to **systemd-hostnamed**, which writes \`/etc/hostname\` and updates the kernel hostname immediately.`,
          useCases: [
            'Building a server with a fixed service address, gateway and corporate DNS per the IP plan',
            'Adding a secondary IP for a migrated application without disturbing the primary address',
            'Enabling dual-stack IPv6 on a web tier with a static /64 address and gateway',
            'Migrating RHEL 9 hosts from ifcfg files to keyfiles before an in-place upgrade to RHEL 10'
          ],
          syntax: 'nmcli connection add type ethernet con-name NAME ifname IFACE ipv4.method manual ipv4.addresses ADDR/PFX ipv4.gateway GW ipv4.dns DNS\nnmcli connection modify NAME [+|-]PROPERTY VALUE\nnmcli connection up NAME\nnmcli connection reload\nnmcli connection migrate [NAME]\nhostnamectl set-hostname FQDN',
          options: [
            ['ipv4.method manual|auto', 'Static addressing or DHCP'],
            ['ipv4.addresses / +ipv4.addresses', 'Replace or append addresses (ADDRESS/PREFIX)'],
            ['ipv4.gateway / ipv6.gateway', 'Default gateway per family'],
            ['ipv4.dns / ipv4.dns-search', 'Name servers and search domains'],
            ['ipv6.method manual|auto|disabled', 'IPv6 addressing mode'],
            ['connection.autoconnect yes', 'Activate the profile automatically at boot'],
            ['nmcli connection migrate', 'Convert ifcfg profiles to keyfiles (RHEL 9)']
          ],
          examples: [
            {
              title: 'Configure static dual-stack addressing on an existing profile',
              cmd: 'sudo nmcli connection modify ens192 ipv4.method manual ipv4.addresses 10.20.30.41/24 ipv4.gateway 10.20.30.1 ipv4.dns "10.20.0.53 10.20.0.54" ipv4.dns-search example.com ipv6.method manual ipv6.addresses 2001:db8:20::41/64 ipv6.gateway 2001:db8:20::1\nsudo nmcli connection up ens192',
              out: 'Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/4)',
              fields: [['Connection successfully activated', 'NetworkManager applied the profile; verify with ip and resolv.conf']]
            },
            {
              title: 'The resulting keyfile on RHEL 9/10',
              cmd: 'sudo cat /etc/NetworkManager/system-connections/ens192.nmconnection',
              out: '[connection]\nid=ens192\nuuid=7d1f2c4e-3b9a-4f8e-9c11-2a6b5d0e9f13\ntype=ethernet\ninterface-name=ens192\n\n[ipv4]\naddress1=10.20.30.41/24,10.20.30.1\ndns=10.20.0.53;10.20.0.54;\ndns-search=example.com;\nmethod=manual\n\n[ipv6]\naddress1=2001:db8:20::41/64,2001:db8:20::1\nmethod=manual',
              fields: [
                ['address1=ADDR/PFX,GW', 'Keyfile syntax: address, prefix and (optionally) gateway'],
                ['dns=...;', 'Semicolon-separated list'],
                ['method=manual', 'Static configuration'],
                ['interface-name', 'Binds the profile to the device']
              ],
              note: 'On RHEL 8 the same profile is /etc/sysconfig/network-scripts/ifcfg-ens192 with BOOTPROTO=none, IPADDR=, PREFIX=, GATEWAY=, DNS1= lines.'
            },
            {
              title: 'Set and check the hostname',
              cmd: 'sudo hostnamectl set-hostname web01.example.com; hostnamectl',
              out: ' Static hostname: web01.example.com\n       Icon name: computer-vm\n         Chassis: vm\n      Machine ID: 3f0c2b1e8d7a4c6b9e5f1a2d3c4b5a69\n         Boot ID: 9a8b7c6d5e4f40312a1b2c3d4e5f6a7b\n  Virtualization: vmware\nOperating System: Red Hat Enterprise Linux 9.4 (Plow)\n          Kernel: Linux 5.14.0-427.13.1.el9_4.x86_64\n    Architecture: x86-64',
              fields: [['Static hostname', 'Persistent value stored in /etc/hostname'], ['Operating System', 'From /etc/os-release']]
            }
          ],
          walkthrough: [
            'Back up the profile: `sudo cp -a /etc/NetworkManager/system-connections/ens192.nmconnection /root/` (RHEL 8: the ifcfg file).',
            'Set static IPv4 with `nmcli connection modify` (method, addresses, gateway, dns) in a single command so the profile is never half-configured.',
            'Add IPv6: `ipv6.method manual ipv6.addresses ... ipv6.gateway ...`.',
            'Activate from the console: `sudo nmcli connection up ens192`, then verify `ip -br addr`, `ip route`, `ip -6 route`, `cat /etc/resolv.conf`.',
            'Set the hostname with `hostnamectl set-hostname` and confirm `getent hosts $(hostname)` resolves.',
            'Reboot and repeat the verification to prove persistence.'
          ],
          lab: {
            goal: 'Configure a persistent dual-stack static profile and hostname that survives reboot (RHCSA style).',
            steps: [
              'Create a new profile on a spare NIC (or use your lab NIC from the console): `sudo nmcli connection add type ethernet con-name static-lab ifname ens224 ipv4.method manual ipv4.addresses 192.168.50.10/24 ipv4.gateway 192.168.50.1 ipv4.dns 192.168.50.1 ipv6.method manual ipv6.addresses fd00:50::10/64`.',
              'Add a secondary IPv4 address: `sudo nmcli connection modify static-lab +ipv4.addresses 192.168.50.11/24`.',
              'Activate: `sudo nmcli connection up static-lab`.',
              'Find the backing file: `nmcli -f NAME,FILENAME connection show | grep static-lab` and check its permissions with `ls -l`.',
              'Set the hostname: `sudo hostnamectl set-hostname lab10.example.com`.',
              'Reboot and verify.'
            ],
            verify: 'After reboot `ip -br addr show ens224` lists 192.168.50.10/24, 192.168.50.11/24 and fd00:50::10/64; the keyfile is `-rw-------. root root`; `hostnamectl --static` prints lab10.example.com.'
          },
          troubleshooting: {
            scenario: 'An engineer hand-edited a keyfile to change the gateway, restarted nothing, and later the host rebooted with no network at all.',
            steps: [
              'Evidence: `nmcli connection show` no longer lists the profile; `journalctl -u NetworkManager -b` shows a warning that the keyfile was ignored because of insecure permissions (the editor wrote it 0644) or a parse error.',
              'Hypothesis: the edited file is invalid or has permissions NetworkManager rejects, so no profile exists for the device.',
              'Fix (from console): `chmod 600` and `chown root:root` the file, correct the syntax (`address1=ADDR/PFX,GW`), then `nmcli connection reload && nmcli connection up NAME`.',
              'Validate: profile listed, device connected, gateway pingable; adopt nmcli for future changes so values are validated.'
            ]
          },
          mistakes: [
            'Setting ipv4.addresses without ipv4.method manual (or the reverse) — nmcli rejects or the profile stays DHCP.',
            'Using ipv4.addresses X instead of +ipv4.addresses X and silently replacing the existing primary address.',
            'Hand-editing keyfiles and forgetting nmcli connection reload, or leaving them world-readable.',
            'Setting the hostname but never adding DNS or /etc/hosts entries, breaking services that resolve their own name.',
            'Creating ifcfg files on RHEL 10, where the format is no longer supported.'
          ],
          safety: [
            'Changing addressing on the interface carrying your session will disconnect you; work from a console or arm a rollback (for example a timed `nmcli connection up` of the saved original).',
            'Back up the profile file before edits; profile files may contain secrets, so keep backups root-only.',
            'Validate the new IP is free first (`arping -D -I IFACE ADDRESS` returns no replies) to avoid duplicate-address outages.'
          ],
          distro: 'RHEL 8: ifcfg files in /etc/sysconfig/network-scripts are the default store. RHEL 9: keyfiles in /etc/NetworkManager/system-connections are the default and ifcfg is deprecated but readable. RHEL 10: keyfile only; migrate with nmcli connection migrate. Ubuntu Server uses netplan YAML in /etc/netplan; Debian commonly uses /etc/network/interfaces.',
          challenge: {
            task: 'Configure ens192 persistently with 172.25.250.11/24, gateway 172.25.250.254, DNS 172.25.250.254, IPv6 fd00:250::11/64, hostname servera.lab.example.com, without losing the existing profile name. Prove it survives reboot.',
            solution: `\`\`\`
sudo nmcli connection modify ens192 \\
  ipv4.method manual ipv4.addresses 172.25.250.11/24 ipv4.gateway 172.25.250.254 ipv4.dns 172.25.250.254 \\
  ipv6.method manual ipv6.addresses fd00:250::11/64 connection.autoconnect yes
sudo nmcli connection up ens192
sudo hostnamectl set-hostname servera.lab.example.com
\`\`\`

Set method and addresses in the same command because nmcli validates the combination. Verify, reboot, verify again:

\`\`\`
ip -br addr show ens192; ip route; grep nameserver /etc/resolv.conf; hostnamectl --static
sudo systemctl reboot
\`\`\`

Using nmcli (not ip) is what makes it persistent; on RHEL 9/10 the change lands in \`/etc/NetworkManager/system-connections/ens192.nmconnection\`.`
          },
          interview: [
            { q: 'Where are NetworkManager profiles stored on RHEL 8, 9 and 10?', a: 'RHEL 8 uses ifcfg files in /etc/sysconfig/network-scripts by default. RHEL 9 writes keyfiles to /etc/NetworkManager/system-connections/*.nmconnection and still reads deprecated ifcfg files. RHEL 10 supports keyfiles only, so ifcfg profiles must be migrated (nmcli connection migrate).', mistake: 'Saying network-scripts is still the RHEL 9 standard.', followUp: 'What permissions must a keyfile have?' },
            { q: 'How do you add a second IP address to an interface without removing the first?', a: 'nmcli connection modify NAME +ipv4.addresses ADDR/PFX followed by nmcli connection up NAME (or device reapply). The + appends rather than replaces.', mistake: 'Using ip addr add and calling it done.', followUp: 'How would you remove only that secondary address later?' },
            { q: 'What is the difference between the static and transient hostname?', a: 'The static hostname is configured by the admin and stored in /etc/hostname; the transient hostname is the kernel runtime name, which can be set from DHCP or fall back when no static name exists. hostnamectl set-hostname sets the static one and the runtime name.', mistake: 'Editing /proc/sys/kernel/hostname and expecting persistence.', followUp: 'Why must the hostname also resolve?' }
          ],
          revision: [
            'Static = ipv4.method manual + ipv4.addresses + ipv4.gateway + ipv4.dns, then nmcli connection up.',
            '+property appends, -property removes, plain property replaces.',
            'RHEL 8 ifcfg; RHEL 9 keyfile default (ifcfg deprecated); RHEL 10 keyfile only.',
            'Keyfiles: root-owned, 0600; after hand edits run nmcli connection reload.',
            'hostnamectl set-hostname writes /etc/hostname; also make the name resolvable.'
          ]
        }
      ]
    },
    {
      id: 'L10-M3', title: 'Routing, ARP and MTU',
      summary: 'How the kernel chooses a path for every packet, how it finds the next-hop MAC address, and how packet size limits cause some of the most confusing failures in production.',
      lessons: [
        {
          id: 'L10-M3-T1',
          title: 'The routing table, default gateway and persistent static routes',
          minutes: 45,
          objectives: [
            'Read ip route output and explain connected, static and default routes',
            'Predict the route for any destination using longest-prefix match and metrics, and confirm with ip route get',
            'Add persistent IPv4 and IPv6 static routes to a NetworkManager profile',
            'Diagnose asymmetric routing and missing return routes on multi-homed hosts'
          ],
          prereqs: ['L10-M2-T2'],
          concept: `Every outgoing packet passes through a **routing decision**: the kernel looks up the destination address in the **routing table** and picks the entry that matches best. Each entry says "to reach this prefix, send out this device, optionally **via** this next-hop gateway".

Route types you will see:

- **Connected routes** (\`proto kernel scope link\`) — created automatically for each configured address/prefix. Destinations in them are on-link: no gateway.
- **Static routes** — added by an administrator for specific networks behind a particular router, e.g. \`10.50.0.0/16 via 10.20.30.254\`.
- **The default route** (\`default\`, i.e. \`0.0.0.0/0\` or \`::/0\`) — matches everything; used when nothing more specific matches. Normally there should be exactly one effective default route per address family.

**Longest-prefix match** decides between overlapping entries: a /24 beats a /16, which beats the /0 default, regardless of the order they appear in. When two routes have the same prefix, the lower **metric** wins. NetworkManager gives each connection a default metric (wired typically 100, Wi-Fi 600) so a host with two default routes still prefers one; set \`ipv4.route-metric\` to control it.

\`ip route get DESTINATION\` asks the kernel which route, device, gateway and source address it would actually use — it is the single most useful routing command because it removes guesswork.

**Persistence**: \`ip route add\` changes only the running kernel. Persistent routes belong in the connection profile: \`nmcli connection modify ens192 +ipv4.routes "10.50.0.0/16 10.20.30.254"\` (optionally followed by a metric), then reactivate. IPv6 uses \`+ipv6.routes "2001:db8:50::/48 2001:db8:20::fe"\`. On RHEL 8 with ifcfg profiles these are written to \`/etc/sysconfig/network-scripts/route-ens192\`; on RHEL 9/10 they live in the keyfile as \`route1=10.50.0.0/16,10.20.30.254\`.

**Routing is a two-way problem.** A reply must also find a way back. On a **multi-homed** host (two interfaces in different networks), a request arriving on ens224 may be answered out of ens192 because the default route points there. Upstream firewalls and the kernel's **reverse path filter** (\`net.ipv4.conf.*.rp_filter\`, strict mode drops packets whose source would not be routed back out the same interface) then drop the traffic. Fixes include specific static routes for the client networks, or policy-based routing (routing rules per source address), not disabling protections.

The host itself does not forward packets between interfaces unless \`net.ipv4.ip_forward=1\` — that is a router or container-host setting, not something application servers need.`,
          internals: `Linux actually has multiple routing tables (\`main\`, \`local\`, \`default\`) selected by **policy rules** (\`ip rule\`). The \`local\` table holds routes for the host's own addresses and broadcasts; \`ip route\` shows \`main\` by default. Policy routing adds rules like "from 10.60.0.0/24 lookup 200" so traffic sourced from a second interface uses its own default gateway — NetworkManager can configure this with \`ipv4.routing-rules\`.

When a route uses \`via\`, the kernel needs the gateway MAC address, obtained through ARP (IPv4) or neighbour discovery (IPv6) — the next lesson. A gateway that is not inside a connected prefix is rejected with *Nexthop has invalid gateway* unless marked \`onlink\`. The \`src\` hint in a route sets the preferred source address for locally originated traffic.`,
          useCases: [
            'Reaching a backup network or management VLAN through a dedicated router while the default route points to the production firewall',
            'Fixing "works from some subnets, not others" on a dual-homed database server with asymmetric return paths',
            'Confirming during a change that new routes win over the default using ip route get before announcing completion',
            'Setting route metrics so a backup uplink is used only when the primary goes away'
          ],
          syntax: 'ip route [show]\nip -6 route\nip route get DESTINATION\nip route add PREFIX via GW [dev IFACE]   # runtime only\nnmcli connection modify NAME +ipv4.routes "PREFIX GW [METRIC]"\nnmcli connection modify NAME ipv4.route-metric N\nip rule show',
          options: [
            ['via GW', 'Next-hop router for the prefix'],
            ['dev IFACE', 'Outgoing interface'],
            ['metric N', 'Preference among equal prefixes; lower wins'],
            ['+ipv4.routes / -ipv4.routes', 'Add or remove a persistent route in a profile'],
            ['ipv4.never-default yes', 'Never install a default route from this profile (useful on secondary NICs)'],
            ['ip route get ADDR from SRC', 'Show the route for traffic sourced from a specific address']
          ],
          examples: [
            {
              title: 'Read the IPv4 routing table',
              cmd: 'ip route',
              out: 'default via 10.20.30.1 dev ens192 proto static metric 100\n10.20.30.0/24 dev ens192 proto kernel scope link src 10.20.30.41 metric 100\n10.50.0.0/16 via 10.20.30.254 dev ens192 proto static metric 100\n192.168.200.0/24 dev ens224 proto kernel scope link src 192.168.200.41 metric 101',
              fields: [
                ['default via 10.20.30.1', 'Everything not matched elsewhere goes to this gateway'],
                ['proto kernel scope link', 'Connected route created from the interface address'],
                ['10.50.0.0/16 via 10.20.30.254', 'Static route to a network behind a different router'],
                ['src 10.20.30.41', 'Preferred source address for traffic using this route'],
                ['metric', 'Tie-breaker between routes with equal prefix length']
              ]
            },
            {
              title: 'Ask the kernel which path it will use',
              cmd: 'ip route get 10.50.8.20',
              out: '10.50.8.20 via 10.20.30.254 dev ens192 src 10.20.30.41 uid 1000\n    cache',
              fields: [['via 10.20.30.254', 'The /16 static route beat the default because it is more specific'], ['src', 'Source address replies will be sent to']]
            },
            {
              title: 'Persist a static route on RHEL 9',
              cmd: 'sudo nmcli connection modify ens192 +ipv4.routes "10.50.0.0/16 10.20.30.254"\nsudo nmcli connection up ens192\nnmcli -g ipv4.routes connection show ens192',
              out: '10.50.0.0/16 10.20.30.254',
              fields: [['10.50.0.0/16 10.20.30.254', 'Stored in the keyfile as route1=10.50.0.0/16,10.20.30.254']]
            }
          ],
          walkthrough: [
            'Run `ip route` and `ip -6 route` and classify every line as connected, static or default.',
            'Run `ip route get` for a local-subnet address, a remote address and 1.1.1.1; explain each result.',
            'Add a runtime route: `sudo ip route add 198.51.100.0/24 via <your gateway>` and confirm with `ip route get 198.51.100.10`.',
            'Reactivate the profile from the console (`sudo nmcli connection up ens192`) and observe that the runtime route is gone.',
            'Add it persistently with `nmcli connection modify ... +ipv4.routes` and reactivate; verify in `ip route` and the keyfile.'
          ],
          lab: {
            goal: 'Create, verify and remove persistent static routes for IPv4 and IPv6.',
            steps: [
              'Note your gateway: `ip route show default`.',
              'Add persistent routes: `sudo nmcli connection modify ens192 +ipv4.routes "198.51.100.0/24 <GW> 50"` and, if IPv6 is configured, `+ipv6.routes "2001:db8:99::/48 <GW6>"`.',
              'Apply with `sudo nmcli connection up ens192`.',
              'Verify: `ip route get 198.51.100.10` and `grep route /etc/NetworkManager/system-connections/ens192.nmconnection`.',
              'Remove the route: `sudo nmcli connection modify ens192 -ipv4.routes "198.51.100.0/24 <GW> 50"` and reactivate.'
            ],
            verify: '`ip route` shows `198.51.100.0/24 via <GW> ... metric 50` after adding and survives `nmcli connection up` or a reboot; after removal it is absent from both ip route and the keyfile.'
          },
          troubleshooting: {
            scenario: 'A backup server with interfaces in production (ens192) and backup (ens224) networks is reachable by SSH from the backup VLAN 172.30.0.0/24, but backup clients in 172.31.0.0/24 behind the backup router time out.',
            steps: [
              'Evidence: `ip route get 172.31.0.15` returns `via 10.20.30.1 dev ens192` — replies leave via the production default gateway; tcpdump on ens224 shows SYNs arriving, no SYN-ACK leaving on ens224.',
              'Hypothesis: asymmetric routing — there is no route for 172.31.0.0/24 via the backup router, so replies go out the wrong interface and are dropped by rp_filter or the production firewall.',
              'Fix: `nmcli connection modify ens224 +ipv4.routes "172.31.0.0/24 172.30.0.1"` and `nmcli connection up ens224` (keep ens224 never-default).',
              'Validate: `ip route get 172.31.0.15` shows `via 172.30.0.1 dev ens224` and a backup client completes a connection.'
            ]
          },
          mistakes: [
            'Adding a second default gateway on a secondary NIC "to make it work", creating unpredictable paths.',
            'Persisting routes with rc.local or cron instead of the connection profile.',
            'Forgetting that the return path matters as much as the forward path.',
            'Disabling rp_filter globally to hide an asymmetric routing design error.',
            'Typing the gateway outside the interface subnet and wondering why the route is rejected.'
          ],
          safety: [
            'Changing or deleting the default route on a remote host will cut your session — use the console and have a rollback ready.',
            'Test the effect with `ip route get` before and after; it is read-only and safe.',
            'Route changes require root; document them in the change record because they affect other teams.'
          ],
          distro: 'RHEL 8 ifcfg profiles store routes in route-IFACE files; RHEL 9/10 keyfiles store them as routeN= lines. Debian ifupdown uses `up ip route add ...` lines or post-up hooks; netplan uses a `routes:` list. The ip route syntax is the same everywhere; the deprecated route -n command is not installed by default on RHEL.',
          challenge: {
            task: 'A host must reach 10.88.0.0/16 via 10.20.30.250 and all other traffic via 10.20.30.1. Make it persistent, prove the kernel chooses correctly, and explain why order of entries in the table does not matter.',
            solution: `\`\`\`
sudo nmcli connection modify ens192 ipv4.gateway 10.20.30.1 +ipv4.routes "10.88.0.0/16 10.20.30.250"
sudo nmcli connection up ens192
ip route get 10.88.4.4   # via 10.20.30.250
ip route get 8.8.8.8     # via 10.20.30.1
\`\`\`

The kernel uses **longest-prefix match**: a /16 is more specific than the /0 default, so it always wins for addresses inside 10.88.0.0/16, independent of the listing order. Metrics only break ties between equal-length prefixes.`
          },
          interview: [
            { q: 'How does Linux choose between a default route and a /16 static route?', a: 'Longest-prefix match: the most specific matching prefix wins, so the /16 is used for its destinations and the default for everything else. Metric only decides between routes with the same prefix length.', mistake: 'Saying the first route listed wins.', followUp: 'Which command shows the decision for a specific destination?' },
            { q: 'How do you add a static route that survives reboot on RHEL 9?', a: 'nmcli connection modify PROFILE +ipv4.routes "PREFIX GATEWAY [METRIC]" then nmcli connection up PROFILE. It is stored in the keyfile in /etc/NetworkManager/system-connections.', mistake: 'ip route add only.', followUp: 'Where did the same route live on RHEL 8?' },
            { q: 'What is asymmetric routing and why does it break connections?', a: 'Requests arrive on one interface but replies leave through another because of the routing table. Stateful firewalls and the reverse path filter drop the replies because they do not match the session or expected interface. Fix with specific routes or policy routing.', mistake: 'Suggesting to turn off the firewall.', followUp: 'How would tcpdump on both interfaces confirm it?' }
          ],
          revision: [
            'Longest prefix wins; metric breaks ties; default = 0.0.0.0/0 or ::/0.',
            'ip route get DEST shows the real decision (device, gateway, source).',
            'Persist routes with nmcli +ipv4.routes / +ipv6.routes; ip route add is runtime only.',
            'Multi-homed hosts need correct return paths; avoid two default gateways.',
            'ipv4.never-default yes stops a secondary profile from installing a default route.'
          ]
        },
        {
          id: 'L10-M3-T2',
          title: 'ARP, IPv6 neighbour discovery and MTU problems',
          minutes: 40,
          objectives: [
            'Explain how ARP and IPv6 neighbour discovery map IP addresses to MAC addresses',
            'Read ip neigh states and recognise INCOMPLETE/FAILED entries and duplicate address symptoms',
            'Detect path MTU problems with ping -M do and tracepath',
            'Set MTU persistently with nmcli and explain when jumbo frames help or hurt'
          ],
          prereqs: ['L10-M3-T1'],
          concept: `Routing tells the kernel *which* next hop to use; the link layer still needs that hop's **MAC address** to build an Ethernet frame.

**ARP** (Address Resolution Protocol, IPv4) broadcasts "who has 10.20.30.1? tell 10.20.30.41"; the owner replies with its MAC. The answer is cached in the **neighbour table**. **IPv6** uses **Neighbour Discovery (NDP)** — ICMPv6 Neighbour Solicitation / Advertisement sent to a multicast address — for the same job, plus router discovery and duplicate address detection.

\`ip neigh\` shows the table with states:

- **REACHABLE** — recently confirmed.
- **STALE** — not confirmed recently; will be re-checked on next use (normal).
- **DELAY / PROBE** — being re-verified.
- **INCOMPLETE** — a request was sent and no answer yet.
- **FAILED** — no answer; the kernel reports *Destination Host Unreachable* (ping) or *No route to host* (connect) for on-link destinations.

A FAILED entry for your **gateway** explains a host that "can't reach anything off-subnet" even with a perfect routing table. A **duplicate IP** — two hosts claiming the same address — causes intermittent failures as switches and neighbours flip between two MACs. Detect it with \`arping -D -I ens192 10.20.30.41\` (duplicate address detection: any reply means someone else owns it) or by seeing the MAC for an address change in \`ip neigh\`.

**MTU** (Maximum Transmission Unit) is the largest IP packet a link carries without fragmentation — 1500 bytes on standard Ethernet, 9000 on jumbo-frame networks, often less on tunnels and VPNs (e.g. 1450 for VXLAN, ~1400 for IPsec). The **path MTU** is the smallest MTU along a route. TCP adapts using **Path MTU Discovery**: packets are sent with the *Don't Fragment* bit, and a router that cannot forward them must return **ICMP "fragmentation needed"** (IPv4) or **"packet too big"** (IPv6, where routers never fragment). If a firewall blocks those ICMP messages you get a **PMTU black hole**: the TCP handshake and small requests work, but large transfers, TLS handshakes with big certificate chains, or SSH after login hang.

Test it: \`ping -M do -s 1472 HOST\` sends a 1500-byte packet (1472 data + 8 ICMP header + 20 IP header) with DF set. If it fails while \`-s 1372\` works, the path MTU is somewhere between. \`tracepath HOST\` discovers and prints the path MTU hop by hop, without root.

MTU must match on every device in a layer-2 segment. Setting 9000 on a server whose switch port is 1500 makes large packets disappear silently.`,
          internals: `Neighbour entries live per interface in the kernel; garbage collection thresholds are \`net.ipv4.neigh.default.gc_thresh1/2/3\` — very large flat subnets or container hosts can overflow them, producing *neighbour table overflow* messages in the journal.

A host also sends **gratuitous ARP** when an address is brought up or moves (for example a keepalived/Pacemaker virtual IP failover) so neighbours update their caches immediately.

The kernel caches learned path MTUs per destination; \`ip route get DEST\` shows \`mtu N\` in the cache line when a lower PMTU has been learned. TCP also advertises an **MSS** (maximum segment size = MTU - 40 bytes for IPv4) in the SYN, which is why some firewalls "clamp" MSS to work around tunnels.`,
          useCases: [
            'Explaining intermittent outages after a new VM was built with an address already used by an appliance',
            'Diagnosing large file transfers that stall over a new site-to-site VPN while ping and small HTTP requests work',
            'Rolling out jumbo frames on a dedicated storage/iSCSI network and proving end-to-end MTU',
            'Verifying a cluster virtual IP moved by checking the MAC address neighbours have cached'
          ],
          syntax: 'ip neigh [show dev IFACE]\nip -6 neigh\narping -I IFACE -c 3 ADDRESS\narping -D -I IFACE -c 2 ADDRESS\nping -M do -s SIZE HOST\ntracepath [-n] HOST\nnmcli connection modify NAME 802-3-ethernet.mtu N',
          options: [
            ['ip neigh flush dev IFACE', 'Clear cached neighbour entries (forces re-resolution)'],
            ['arping -D', 'Duplicate address detection; replies indicate a conflict'],
            ['ping -M do', 'Set Don\'t Fragment (prohibit fragmentation) to test path MTU'],
            ['ping -s SIZE', 'ICMP payload size; packet = SIZE + 28 for IPv4'],
            ['tracepath -n', 'Show path MTU per hop without name lookups'],
            ['802-3-ethernet.mtu', 'Persistent MTU for an Ethernet profile (alias ethernet.mtu)']
          ],
          examples: [
            {
              title: 'Neighbour table with a failed gateway',
              cmd: 'ip neigh show dev ens192',
              out: '10.20.30.1  FAILED\n10.20.30.42 lladdr 00:50:56:8a:44:12 STALE\n10.20.30.43 lladdr 00:50:56:8a:51:9e REACHABLE',
              fields: [
                ['10.20.30.1 FAILED', 'The gateway did not answer ARP: everything off-subnet is unreachable'],
                ['lladdr ... STALE', 'Cached MAC not confirmed recently; normal'],
                ['REACHABLE', 'Recently confirmed neighbour']
              ]
            },
            {
              title: 'Find the path MTU over a VPN',
              cmd: 'ping -M do -s 1472 -c 2 10.90.1.20; ping -M do -s 1372 -c 2 10.90.1.20',
              out: 'PING 10.90.1.20 (10.90.1.20) 1472(1500) bytes of data.\nFrom 10.20.30.1 icmp_seq=1 Frag needed and DF set (mtu = 1400)\nping: local error: message too long, mtu=1400\n--- 10.90.1.20 ping statistics ---\n2 packets transmitted, 0 received, +2 errors, 100% packet loss\nPING 10.90.1.20 (10.90.1.20) 1372(1400) bytes of data.\n1380 bytes from 10.90.1.20: icmp_seq=1 ttl=62 time=8.41 ms\n1380 bytes from 10.90.1.20: icmp_seq=2 ttl=62 time=8.37 ms',
              fields: [
                ['1472(1500)', 'Payload 1472 + 28 header bytes = 1500-byte packet'],
                ['Frag needed and DF set (mtu = 1400)', 'A router reported the next-hop MTU: PMTUD is working'],
                ['local error: message too long, mtu=1400', 'The kernel cached the learned PMTU and refused the next large packet locally'],
                ['1372(1400) succeeds', 'Path MTU is 1400']
              ],
              note: 'If large pings simply time out with no "Frag needed" message, ICMP is being filtered: a PMTU black hole.'
            },
            {
              title: 'tracepath reports PMTU per hop',
              cmd: 'tracepath -n 10.90.1.20',
              out: ' 1?: [LOCALHOST]                      pmtu 1500\n 1:  10.20.30.1                         0.512ms\n 2:  172.16.0.9                         1.902ms pmtu 1400\n 2:  172.16.0.9                         1.877ms\n 3:  10.90.1.20                         8.402ms reached\n     Resume: pmtu 1400 hops 3 back 3',
              fields: [['pmtu 1400 at hop 2', 'The VPN hop reduces the path MTU'], ['Resume: pmtu 1400', 'End-to-end path MTU']]
            }
          ],
          walkthrough: [
            'Run `ip neigh` and identify your gateway entry and its state.',
            'Flush and re-resolve: `sudo ip neigh flush dev ens192`, then `ping -c1 <gateway>` and `ip neigh` again.',
            'Check for a duplicate of your own address: `sudo arping -D -I ens192 -c 2 <your IP>` (expect no replies).',
            'Run `ping -M do -s 1472 -c 2 <gateway>` and then a remote host; compare.',
            'Run `tracepath -n` to a remote destination and read the pmtu values.',
            'Inspect the current MTU in the profile: `nmcli -g 802-3-ethernet.mtu connection show ens192` (auto means the driver default, usually 1500).'
          ],
          lab: {
            goal: 'Observe ARP resolution, detect address conflicts and measure path MTU on a lab host.',
            steps: [
              'Install tools if missing: `sudo dnf install -y iputils` (ping, arping, tracepath).',
              'Record `ip neigh` before and after `ping -c1` to a neighbour on your subnet.',
              'Run `sudo arping -D -I ens192 -c 2 <an unused lab IP>` and then `<your gateway IP>`; compare exit codes with `echo $?`.',
              'Find the largest DF ping to your gateway: start at `-s 1472` and lower until it succeeds.',
              'On a lab-only NIC, set a persistent MTU: `sudo nmcli connection modify static-lab 802-3-ethernet.mtu 1400 && sudo nmcli connection up static-lab`, verify with `ip link show ens224`, then set it back to `auto`.'
            ],
            verify: 'arping -D exits 0 (no conflict) for the unused IP and non-zero for the gateway address (it replied). `ip link show ens224` shows `mtu 1400` while the lab setting is applied and the profile keyfile contains `mtu=1400`.'
          },
          troubleshooting: {
            scenario: 'After a migration to a new datacentre linked by an IPsec tunnel, users can log in to an application but report that report downloads hang forever. Ping works.',
            steps: [
              'Evidence: `curl -o /dev/null https://app/report` stalls after the TLS handshake starts; `ping -M do -s 1472 app` times out with no "Frag needed"; `-s 1372` works.',
              'Hypothesis: the tunnel MTU is ~1400 and a firewall drops ICMP fragmentation-needed messages, so PMTUD cannot work (PMTU black hole).',
              'Fix: ask the network team to permit ICMP type 3 code 4 (and ICMPv6 packet-too-big) through the firewalls, or clamp TCP MSS on the tunnel endpoints; as a temporary host-side workaround lower the MTU on the affected profile.',
              'Validate: large downloads complete; `tracepath` shows pmtu 1400 discovered end to end.'
            ]
          },
          mistakes: [
            'Blocking all ICMP "for security", which breaks path MTU discovery and makes failures look random.',
            'Enabling jumbo frames on servers without matching switch and peer MTU settings.',
            'Forgetting to add 28 bytes (IPv4) when converting ping -s values to packet size.',
            'Bringing up a "temporary" test IP without duplicate detection and knocking a production service offline.'
          ],
          safety: [
            'Changing MTU on the management interface can make your SSH session hang on large output; test on a secondary interface or from the console.',
            'arping and ip neigh flush need root; flushing is harmless but briefly delays traffic while entries re-resolve.',
            'Coordinate MTU changes with network teams; a mismatch causes silent data-path failures.'
          ],
          distro: 'iputils (ping, arping, tracepath) and iproute2 behave the same on RHEL 8/9/10, Debian and Ubuntu. Debian often packages arping from a different upstream (the arping package) with slightly different flags; RHEL\'s iputils arping uses -D, -I and -c as shown.',
          challenge: {
            task: 'Two servers on the same VLAN can ping each other with default size but an NFS mount between them hangs during large reads. One server has MTU 9000, the other 1500. Explain the failure and give the correct fix and verification.',
            solution: `On the same layer-2 segment there is **no router** to send "fragmentation needed", so frames larger than 1500 bytes from the 9000-MTU host are simply dropped by the switch or the peer NIC. Small packets (pings, NFS metadata) work; large reads stall.

Fix: make MTU consistent across the segment. If the storage network is designed for jumbo frames, set 9000 on both hosts *and* the switch ports; otherwise set both to 1500:

\`\`\`
sudo nmcli connection modify storage 802-3-ethernet.mtu 9000
sudo nmcli connection up storage
\`\`\`

Verify end to end with a DF ping sized for the MTU: \`ping -M do -s 8972 -c 3 PEER\` (8972 + 28 = 9000). It must succeed in both directions before re-testing NFS.`
          },
          interview: [
            { q: 'What does an ARP entry in state FAILED for the default gateway mean?', a: 'The host sent ARP requests for the gateway and received no reply, so it cannot build frames to it; all off-subnet traffic fails. Check link, VLAN tagging, the gateway itself and for a wrong address or prefix.', mistake: 'Starting with DNS or routing table changes.', followUp: 'What error does ping show in that case?' },
            { q: 'What is a PMTU black hole?', a: 'Path MTU discovery depends on routers returning ICMP fragmentation-needed / packet-too-big. If a firewall blocks those messages, packets larger than the path MTU vanish and the sender never learns to shrink them: small exchanges work, big transfers hang.', mistake: 'Calling it packet loss or bandwidth saturation.', followUp: 'How do you prove it with ping?' },
            { q: 'How would you check that an IP is not already in use before assigning it?', a: 'arping -D -I IFACE -c 2 ADDRESS: duplicate address detection; any reply means another host owns it. Also check IPAM/DNS. For IPv6 the kernel performs DAD automatically and marks conflicts dadfailed.', mistake: 'Pinging it once and assuming no reply means free (ICMP may be filtered).', followUp: 'What is gratuitous ARP used for?' }
          ],
          revision: [
            'ARP (IPv4) / NDP (IPv6) map next-hop IPs to MACs; see them with ip neigh.',
            'FAILED/INCOMPLETE = no answer; for on-link targets you get Destination Host Unreachable / No route to host.',
            'arping -D detects duplicate addresses before you use one.',
            'ping -M do -s 1472 tests a 1500-byte path; tracepath shows pmtu per hop.',
            'Blocking ICMP frag-needed/packet-too-big creates PMTU black holes.',
            'MTU must match across a L2 segment; persist with 802-3-ethernet.mtu.'
          ]
        }
      ]
    },
    {
      id: 'L10-M4', title: 'DNS and name resolution',
      summary: 'How a name becomes an address on Linux: the NSS order, /etc/hosts, the resolver configuration NetworkManager manages, DNS queries with dig, and the DHCP process that often supplies it all.',
      lessons: [
        {
          id: 'L10-M4-T1',
          title: 'The resolver stack: nsswitch.conf, /etc/hosts and resolv.conf',
          minutes: 40,
          objectives: [
            'Trace a lookup through the NSS hosts order (files, dns, myhostname)',
            'Read and correctly change resolv.conf settings through NetworkManager',
            'Use getent hosts to test resolution exactly as applications do',
            'Explain search domains, ndots and timeouts and their failure modes'
          ],
          prereqs: ['L10-M2-T2'],
          concept: `Applications do not talk to DNS directly. They call the C library (\`getaddrinfo()\`), and glibc's **Name Service Switch (NSS)** decides where to look, in the order given by the \`hosts:\` line of \`/etc/nsswitch.conf\`:

\`\`\`
hosts:      files dns myhostname
\`\`\`

- **files** — \`/etc/hosts\`, a static table of \`ADDRESS  CANONICAL-NAME  [ALIASES]\`. Checked first, so an entry here *overrides DNS*. Ideal for a host's own name on small labs; dangerous when forgotten (a stale entry silently redirects traffic after a migration).
- **dns** — the DNS resolver configured by \`/etc/resolv.conf\`.
- **myhostname** — systemd module that always resolves the local hostname and \`localhost\`.

On RHEL 8+ \`/etc/nsswitch.conf\` is managed by **authselect**; change it through an authselect profile (or its user-nsswitch.conf) rather than editing it directly.

\`/etc/resolv.conf\` configures the DNS client:

\`\`\`
# Generated by NetworkManager
search example.com corp.example.com
nameserver 10.20.0.53
nameserver 10.20.0.54
options timeout:2 attempts:2
\`\`\`

- **nameserver** — up to three servers, tried *in order*; the second is used only when the first does not answer within the timeout. A dead first server therefore adds seconds to every lookup.
- **search** — domains appended to short names: \`ssh db01\` tries \`db01.example.com\`, then \`db01.corp.example.com\`.
- **options ndots:N** — a name with fewer than N dots is tried with search domains first (default 1).
- **options timeout/attempts/rotate** — per-query timeout, retries, and round-robin across servers.

On RHEL, **NetworkManager writes resolv.conf** from the active profiles' \`ipv4.dns\`, \`ipv4.dns-search\`, \`ipv6.dns\` and DHCP-provided values. Hand edits are overwritten at the next activation or DHCP renewal. Change DNS with nmcli (\`ipv4.dns\`, \`ipv4.ignore-auto-dns yes\` to drop DHCP servers) or, to opt out deliberately, set \`dns=none\` in a file under \`/etc/NetworkManager/conf.d/\`.

**Testing tools differ in what they test**: \`getent hosts NAME\` (or \`getent ahosts\`) goes through NSS exactly like an application, including /etc/hosts. \`dig\` and \`host\` query DNS servers *directly* and ignore /etc/hosts and nsswitch. When "dig works but the app fails" (or vice versa), the difference is almost always /etc/hosts, the search list, or nsswitch order.`,
          internals: `glibc reads resolv.conf and sends UDP port 53 queries for A and AAAA records in parallel by default, switching to TCP for truncated responses. There is no system-wide cache by default on RHEL (each process resolves independently); \`nscd\` or systemd-resolved can add one, and long-running applications such as the JVM may cache results internally.

NetworkManager keeps its own view of DNS; \`nmcli dev show ens192 | grep DNS\` shows per-device servers, and \`/run/NetworkManager/resolv.conf\` holds the version it generated. If \`/etc/resolv.conf\` is a symlink to systemd-resolved's stub (\`127.0.0.53\`), as on Ubuntu, queries go through resolved first; RHEL does not enable resolved by default.`,
          useCases: [
            'Pinning a name with /etc/hosts during a cut-over test, and then removing it before go-live',
            'Finding why lookups take 5 seconds: the first nameserver in resolv.conf is decommissioned',
            'Replacing DHCP-supplied resolvers with corporate DNS on a cloud host using ignore-auto-dns',
            'Explaining why an app reaches the old server after DNS was changed: a stale /etc/hosts entry wins'
          ],
          syntax: 'getent hosts NAME\ngetent ahosts NAME\ngrep ^hosts /etc/nsswitch.conf\ncat /etc/resolv.conf\nnmcli connection modify NAME ipv4.dns "S1 S2" ipv4.dns-search DOM ipv4.ignore-auto-dns yes',
          options: [
            ['getent hosts', 'Resolve via NSS (files, dns, ...) like applications do'],
            ['getent ahosts', 'Show all addresses getaddrinfo returns (IPv4 and IPv6)'],
            ['ipv4.dns / ipv6.dns', 'Persistent name servers in the profile'],
            ['ipv4.dns-search', 'Search domain list'],
            ['ipv4.ignore-auto-dns yes', 'Ignore DNS servers learned from DHCP'],
            ['ipv4.dns-options', 'resolv.conf options such as "timeout:2 attempts:2 rotate"']
          ],
          examples: [
            {
              title: 'Resolution differs between getent and dig',
              cmd: 'getent hosts app.example.com; dig +short app.example.com',
              out: '10.20.30.99     app.example.com\n10.70.4.15',
              fields: [
                ['getent: 10.20.30.99', 'Answer from /etc/hosts (files is first in nsswitch)'],
                ['dig: 10.70.4.15', 'What DNS really says: the /etc/hosts entry is stale']
              ],
              note: 'Check with `grep app /etc/hosts`; remove stale pins once a migration is complete.'
            },
            {
              title: 'Change DNS servers persistently',
              cmd: 'sudo nmcli connection modify ens192 ipv4.dns "10.20.0.53 10.20.0.54" ipv4.ignore-auto-dns yes\nsudo nmcli connection up ens192\ncat /etc/resolv.conf',
              out: '# Generated by NetworkManager\nsearch example.com\nnameserver 10.20.0.53\nnameserver 10.20.0.54',
              fields: [['# Generated by NetworkManager', 'NM owns this file; edit the profile, not the file'], ['nameserver order', 'Tried in order; first must be healthy']]
            }
          ],
          walkthrough: [
            'Read `grep ^hosts /etc/nsswitch.conf` and `cat /etc/resolv.conf` and explain each line.',
            'Add a test pin as root: `echo "192.0.2.10 pin-test.example.com" >> /etc/hosts`.',
            'Compare `getent hosts pin-test.example.com` (returns the pin) with `dig +short pin-test.example.com` (no answer).',
            'Remove the pin with `sudo sed -i \'/pin-test.example.com/d\' /etc/hosts`.',
            'Show the DNS servers NetworkManager knows: `nmcli -f IP4.DNS,IP6.DNS device show ens192`.',
            'Change ipv4.dns-search with nmcli and observe resolv.conf update after `nmcli connection up`.'
          ],
          lab: {
            goal: 'Control name resolution order and DNS settings through supported mechanisms.',
            steps: [
              'Back up: `sudo cp -a /etc/hosts /root/hosts.bak`.',
              'Add your host\'s own FQDN and IP to /etc/hosts and verify with `getent hosts $(hostname)`.',
              'Add a second search domain persistently: `sudo nmcli connection modify ens192 +ipv4.dns-search lab.example.com && sudo nmcli connection up ens192`.',
              'Verify `grep search /etc/resolv.conf` and that `getent hosts servera` would try servera.example.com then servera.lab.example.com (`strace` optional).',
              'Hand-edit /etc/resolv.conf to add a bogus nameserver, run `sudo nmcli connection up ens192`, and observe that NetworkManager rewrote it.'
            ],
            verify: '`grep search /etc/resolv.conf` lists both domains; the bogus nameserver disappears after reactivation; `getent hosts $(hostname)` returns your address.'
          },
          troubleshooting: {
            scenario: 'Every SSH login and every curl on a server pauses for about 5 seconds before doing anything; once connected, everything is fast.',
            steps: [
              'Evidence: `time getent hosts www.example.com` takes ~5 s; `dig @10.20.0.53 www.example.com` times out while `dig @10.20.0.54 ...` answers instantly. resolv.conf lists .53 first.',
              'Hypothesis: the first nameserver is down/decommissioned, so each lookup waits for the timeout before falling back.',
              'Fix: update the profile: `nmcli connection modify ens192 ipv4.dns "10.20.0.54 10.20.0.55"` and `nmcli connection up ens192` (or `device reapply`); fix the DHCP option if DNS comes from DHCP.',
              'Validate: `time getent hosts www.example.com` returns in milliseconds and resolv.conf shows only healthy servers.'
            ]
          },
          mistakes: [
            'Editing /etc/resolv.conf by hand on a NetworkManager host; the change disappears silently.',
            'Testing with dig only and missing an /etc/hosts override that the application uses.',
            'Leaving temporary /etc/hosts pins after a migration.',
            'Listing a slow or remote DNS server first and blaming the application for latency.',
            'Editing /etc/nsswitch.conf directly on RHEL 8+ instead of using authselect.'
          ],
          safety: [
            'Back up /etc/hosts before editing; a bad entry can redirect production traffic to the wrong host.',
            'DNS changes affect every application on the host; validate with getent before closing the change.',
            'Configuration changes need root; queries do not.'
          ],
          distro: 'RHEL 8/9/10: NetworkManager writes /etc/resolv.conf directly and systemd-resolved is not used by default; nsswitch.conf is managed by authselect. Ubuntu uses systemd-resolved with a 127.0.0.53 stub (inspect with resolvectl status). Debian without NetworkManager may use a static resolv.conf or resolvconf package.',
          challenge: {
            task: 'A server gets addresses and DNS from DHCP, but security requires it to use only 10.20.0.53 and 10.20.0.54 and the search domain prod.example.com, while still using DHCP for its IP. Implement it persistently and prove it.',
            solution: `Keep DHCP addressing but ignore DHCP-provided DNS:

\`\`\`
sudo nmcli connection modify ens192 ipv4.method auto ipv4.ignore-auto-dns yes \\
  ipv4.dns "10.20.0.53 10.20.0.54" ipv4.dns-search prod.example.com
sudo nmcli connection up ens192
cat /etc/resolv.conf
getent hosts www.prod.example.com
\`\`\`

\`ignore-auto-dns\` stops the DHCP name servers and search domains from being merged in, so resolv.conf contains only the configured values even after lease renewals. Repeat for IPv6 (\`ipv6.ignore-auto-dns yes\`) if the network advertises DNS via RA/DHCPv6.`
          },
          interview: [
            { q: 'Why might dig return the right address while the application connects to the wrong server?', a: 'dig queries DNS directly. Applications use glibc NSS, which checks /etc/hosts first when nsswitch says "files dns". A stale /etc/hosts entry (or a different search domain expansion) wins. Test with getent hosts.', mistake: 'Blaming DNS caching only.', followUp: 'Where is the lookup order defined?' },
            { q: 'How do you permanently change DNS servers on RHEL 9?', a: 'Through the NetworkManager profile: nmcli connection modify NAME ipv4.dns "..." (and ipv4.ignore-auto-dns yes if DHCP supplies DNS), then reactivate. NetworkManager regenerates resolv.conf.', mistake: 'Editing /etc/resolv.conf.', followUp: 'How could you stop NetworkManager from managing resolv.conf at all?' },
            { q: 'What does the search line in resolv.conf do?', a: 'It lists domains appended to short names. A query for db01 tries db01.<first domain>, then the next. Combined with ndots, it controls when names are treated as relative or absolute.', mistake: 'Confusing it with the domain the host belongs to for security.', followUp: 'Why can a long search list slow down lookups of external names?' }
          ],
          revision: [
            'Apps resolve via NSS: hosts line in /etc/nsswitch.conf (typically files dns myhostname).',
            '/etc/hosts wins over DNS when files is first.',
            'resolv.conf: nameservers tried in order (max 3), search domains appended to short names.',
            'NetworkManager owns resolv.conf on RHEL; change ipv4.dns / ignore-auto-dns with nmcli.',
            'getent hosts = what apps see; dig/host = what DNS servers say.'
          ]
        },
        {
          id: 'L10-M4-T2',
          title: 'Querying DNS with dig and host, and how DHCP configures clients',
          minutes: 45,
          objectives: [
            'Read dig output: status, flags, answer and authority sections, TTL and server',
            'Query specific record types and servers, and perform reverse lookups',
            'Distinguish NOERROR, NXDOMAIN, SERVFAIL and REFUSED and act on each',
            'Describe the DHCP DORA exchange and inspect the lease options NetworkManager received'
          ],
          prereqs: ['L10-M4-T1'],
          concept: `**DNS** is a distributed database of **resource records**. The types you will meet daily:

- **A** — IPv4 address; **AAAA** — IPv6 address.
- **CNAME** — alias to another name (the resolver follows it).
- **PTR** — reverse mapping from address to name, in \`in-addr.arpa\` / \`ip6.arpa\`.
- **MX** — mail exchangers; **NS** — authoritative name servers for a zone; **SOA** — zone metadata; **TXT** — free text (SPF, verification); **SRV** — service location (LDAP, Kerberos, AD).

Clients send recursive queries to a **recursive resolver** (the nameserver in resolv.conf), which walks from the root to the TLD to the zone's **authoritative** servers and caches the answer for its **TTL** (time to live, seconds).

\`dig\` (package **bind-utils**) is the professional tool because it shows everything:

- **status** — \`NOERROR\` (query succeeded; may still have an empty answer if the name exists without that record type), \`NXDOMAIN\` (the name does not exist), \`SERVFAIL\` (the resolver could not get an answer — upstream unreachable, DNSSEC validation failure, broken delegation), \`REFUSED\` (the server will not answer you, e.g. recursion not allowed for your network).
- **flags** — \`qr\` response, \`rd\` recursion desired, \`ra\` recursion available, \`aa\` authoritative answer.
- **ANSWER / AUTHORITY / ADDITIONAL** sections, the TTL of each record, and the **SERVER** that replied.

Useful forms: \`dig NAME\`, \`dig NAME AAAA\`, \`dig +short NAME\`, \`dig @SERVER NAME\` (bypass resolv.conf to compare servers), \`dig -x ADDRESS\` (reverse), \`dig +trace NAME\` (iterate from the root yourself, to find a broken delegation), \`dig +norecurse @AUTH NAME\`. \`host NAME\` gives a short human summary.

Caching explains many "DNS changed but nothing happened" tickets: resolvers keep the old answer until its TTL expires. Lower the TTL before a planned migration.

**DHCP** (Dynamic Host Configuration Protocol, UDP 67 server / 68 client) assigns addresses and options. The exchange is **DORA**: client broadcasts **Discover**, server sends **Offer**, client broadcasts **Request**, server confirms with **Acknowledge**. The lease includes the address, prefix, router (gateway), DNS servers, domain search list, NTP servers and lease time; the client renews at half the lease (T1). DHCP is broadcast-based, so a server on another subnet needs a **DHCP relay** (ip helper) on the router. IPv6 uses SLAAC and/or DHCPv6 (UDP 546/547).

On RHEL a profile with \`ipv4.method auto\` uses NetworkManager's DHCP client (the internal client is the default on RHEL 9 and 10). See what was received with \`nmcli -f DHCP4 device show ens192\`; lease files are kept under \`/var/lib/NetworkManager/\`.`,
          internals: `A dig query is a single UDP datagram to port 53 containing a question (name, type, class IN). Responses over 512 bytes (or the EDNS buffer size) are truncated (\`tc\` flag) and retried over TCP — which is why firewalls must allow TCP 53 to resolvers too. dig does not use /etc/hosts, nsswitch or the search list (unless \`+search\` is given).

For reverse lookups, the address is reversed and appended to \`in-addr.arpa\`: 10.20.30.41 becomes \`41.30.20.10.in-addr.arpa PTR\`. Reverse zones are often managed by a different team than forward zones, so forward and reverse can disagree.

The DHCP client sends a DHCPREQUEST with its client identifier and may send its hostname (\`ipv4.dhcp-hostname\`) so the DHCP server can register it in DNS (dynamic DNS).`,
          useCases: [
            'Proving a migration problem is a cached record: two resolvers return different answers with different TTLs',
            'Diagnosing SERVFAIL for one partner domain caused by a broken DNSSEC signature or delegation, using dig +trace',
            'Checking that Kerberos/AD SRV records resolve before joining a host to a domain',
            'Showing the DHCP options a server received when it unexpectedly got the wrong gateway'
          ],
          syntax: 'dig [@SERVER] NAME [TYPE] [+short|+trace|+norecurse]\ndig -x ADDRESS\nhost NAME [SERVER]\nnmcli -f DHCP4 device show IFACE\nnmcli connection modify NAME ipv4.method auto',
          options: [
            ['@SERVER', 'Query this server instead of resolv.conf'],
            ['TYPE', 'A, AAAA, MX, NS, SOA, TXT, SRV, PTR, CNAME'],
            ['+short', 'Only the answer data'],
            ['+trace', 'Follow delegation from the root servers'],
            ['-x ADDR', 'Reverse (PTR) lookup'],
            ['+tcp', 'Force the query over TCP'],
            ['+noall +answer', 'Show only the answer section']
          ],
          examples: [
            {
              title: 'Read a full dig answer',
              cmd: 'dig www.example.com',
              out: '; <<>> DiG 9.16.23-RH <<>> www.example.com\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 40211\n;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;www.example.com.\t\tIN\tA\n\n;; ANSWER SECTION:\nwww.example.com.\t300\tIN\tCNAME\tweb-lb.example.com.\nweb-lb.example.com.\t60\tIN\tA\t10.70.4.15\n\n;; Query time: 3 msec\n;; SERVER: 10.20.0.53#53(10.20.0.53)\n;; WHEN: Fri Oct 09 10:15:02 UTC 2026\n;; MSG SIZE  rcvd: 86',
              fields: [
                ['status: NOERROR', 'The query succeeded'],
                ['flags: qr rd ra', 'Response, recursion desired and available; no aa, so this came from a cache/recursive server'],
                ['CNAME ... 300', 'www is an alias, cacheable for 300 s'],
                ['A 10.70.4.15 (TTL 60)', 'Final address; cached for at most 60 s'],
                ['SERVER', 'Which resolver answered']
              ]
            },
            {
              title: 'A name that does not exist',
              cmd: 'dig +noall +comments app-old.example.com | grep status',
              out: ';; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 6120',
              fields: [['NXDOMAIN', 'Authoritative statement that the name does not exist: fix the record or the name, not the network']]
            },
            {
              title: 'DHCP options received',
              cmd: 'nmcli -f DHCP4 device show ens192',
              out: 'DHCP4.OPTION[1]:                        dhcp_lease_time = 86400\nDHCP4.OPTION[2]:                        domain_name = example.com\nDHCP4.OPTION[3]:                        domain_name_servers = 10.20.0.53 10.20.0.54\nDHCP4.OPTION[4]:                        ip_address = 10.20.30.77\nDHCP4.OPTION[5]:                        routers = 10.20.30.1\nDHCP4.OPTION[6]:                        subnet_mask = 255.255.255.0',
              fields: [['routers', 'Gateway supplied by DHCP'], ['domain_name_servers', 'DNS servers merged into resolv.conf unless ignore-auto-dns'], ['dhcp_lease_time', 'Lease length in seconds']]
            }
          ],
          walkthrough: [
            'Install tools: `sudo dnf install -y bind-utils`.',
            'Run `dig www.redhat.com` and annotate status, flags, TTLs and SERVER.',
            'Run the same query twice and watch the TTL count down (served from the resolver cache).',
            'Compare two resolvers: `dig @<resolver1> NAME +short` vs `dig @<resolver2> NAME +short`.',
            'Do a reverse lookup of your own IP with `dig -x <IP> +short` and compare with `hostname -f`.',
            'Display DHCP information for a DHCP-configured interface with `nmcli -f DHCP4 device show IFACE`.'
          ],
          lab: {
            goal: 'Use dig to classify DNS failures and inspect DHCP-provided settings.',
            steps: [
              'Query existing, non-existing and record-less names: `dig example.com A`, `dig doesnotexist.example.com`, `dig example.com MX +short`.',
              'Query a server that will refuse recursion (an authoritative-only server, e.g. `dig @a.iana-servers.net www.redhat.com`) and read the status/flags.',
              'Trace a delegation: `dig +trace www.redhat.com | grep -E "NS|A\\s"`.',
              'Reverse lookup: `dig -x 8.8.8.8 +short`.',
              'If a DHCP lab profile exists, activate it and capture `nmcli -f DHCP4 device show IFACE` into `~/dhcp.txt`.'
            ],
            verify: 'You recorded NOERROR with answers, NXDOMAIN for the fake name, an authoritative/no-recursion response (REFUSED or a referral without ra) from the authoritative server, and a PTR name for 8.8.8.8 (dns.google.).'
          },
          troubleshooting: {
            scenario: 'Users report that partner.example.net "does not resolve" from all servers since this morning, while other domains work.',
            steps: [
              'Evidence: `dig partner.example.net` returns `status: SERVFAIL` from both corporate resolvers; `dig +cd partner.example.net` (checking disabled) returns an answer; `dig +trace` shows the partner\'s DNSSEC signatures (RRSIG) expired.',
              'Hypothesis: the partner\'s zone has an expired DNSSEC signature; validating resolvers correctly refuse the answer. The problem is outside our network.',
              'Fix: contact the partner\'s DNS team with the dig evidence; do not disable DNSSEC validation on corporate resolvers. If business-critical, the DNS team can add a time-limited negative trust anchor for that domain only.',
              'Validate: after the partner re-signs, `dig partner.example.net` returns NOERROR with the expected record and the `ad` flag.'
            ]
          },
          mistakes: [
            'Treating NXDOMAIN (name does not exist) like a network outage and escalating to the network team.',
            'Forgetting TTL caching after a DNS change and "fixing" things repeatedly.',
            'Testing only A records while clients prefer AAAA and the AAAA record is wrong.',
            'Allowing UDP 53 but not TCP 53 to resolvers, breaking large responses.',
            'Expecting a DHCP server on another subnet to answer without a relay.'
          ],
          safety: [
            'dig/host are read-only and safe; avoid flooding external servers in loops.',
            'Switching a profile to DHCP (ipv4.method auto) on a remote server can change its address and cut access; do it from the console.',
            'Never disable DNSSEC validation globally to work around one broken domain.'
          ],
          distro: 'dig and host come from bind-utils on RHEL (dnsutils/bind9-dnsutils on Debian/Ubuntu). RHEL 8 NetworkManager used dhclient by default; RHEL 9 and 10 use the internal DHCP client (dhclient is deprecated and removed in RHEL 10). On Ubuntu, resolvectl query also shows which link and server answered.',
          challenge: {
            task: 'After moving app.example.com to a new IP (10.70.9.9), half the users still reach the old server. Using dig only, determine whether the cause is a stale record on one resolver, a TTL still running, or a wrong authoritative record, and explain what each result would mean.',
            solution: `1. Ask the authoritative server directly (find it with \`dig NS example.com +short\`):

\`\`\`
dig @ns1.example.com app.example.com +norecurse +noall +answer
\`\`\`

If it returns the old IP, the **authoritative record is wrong** — fix the zone.

2. Ask each corporate resolver and compare answers and TTLs:

\`\`\`
dig @10.20.0.53 app.example.com +noall +answer
dig @10.20.0.54 app.example.com +noall +answer
\`\`\`

If one returns the old IP with a TTL that is counting down, that resolver has it **cached**; it will expire after TTL seconds (or the DNS team can flush that name). If both return the new IP, the clients themselves (or applications such as the JVM, or /etc/hosts pins) are caching — check with \`getent hosts app.example.com\` on an affected client.

Prevention: lower the TTL (e.g. to 60 s) a day before planned moves.`
          },
          interview: [
            { q: 'What is the difference between NXDOMAIN and SERVFAIL?', a: 'NXDOMAIN is an authoritative answer that the name does not exist. SERVFAIL means the resolver failed to obtain an answer: upstream unreachable, lame delegation or DNSSEC validation failure. NXDOMAIN points to the record/name; SERVFAIL points to the resolution path.', mistake: 'Calling both "DNS is down".', followUp: 'How would dig +trace help with SERVFAIL?' },
            { q: 'Describe the DHCP exchange.', a: 'DORA: the client broadcasts Discover, servers reply with Offer, the client broadcasts Request for one offer, the server sends Acknowledge with the lease and options (gateway, DNS, lease time). Clients renew at T1 (half the lease). Across subnets a relay forwards the broadcasts.', mistake: 'Forgetting the relay requirement.', followUp: 'Which ports does DHCP use?' },
            { q: 'Why does dig show an answer without the aa flag?', a: 'The response came from a recursive resolver (often from its cache), not from an authoritative server for the zone. Query an NS for the zone with +norecurse to get an authoritative answer.', mistake: 'Assuming every answer is authoritative.', followUp: 'What does the TTL in a cached answer tell you?' }
          ],
          revision: [
            'Record types: A, AAAA, CNAME, PTR, MX, NS, SOA, TXT, SRV.',
            'status: NOERROR / NXDOMAIN (no such name) / SERVFAIL (resolution failed) / REFUSED (policy).',
            'dig @server, +short, +trace, -x; dig ignores /etc/hosts.',
            'TTL = how long resolvers may cache; lower it before migrations.',
            'DHCP DORA over UDP 67/68; relays for remote servers; inspect with nmcli -f DHCP4 device show.'
          ]
        }
      ]
    },
    {
      id: 'L10-M5', title: 'Network diagnostics',
      summary: 'A disciplined, layer-by-layer method for connectivity incidents: sockets with ss, reachability with ping and tracepath, application checks with curl and openssl s_client, packet evidence with tcpdump, and the meaning of each connection error.',
      lessons: [
        {
          id: 'L10-M5-T1',
          title: 'Sockets and reachability: ss, ping, traceroute and tracepath',
          minutes: 45,
          objectives: [
            'Use ss to prove which process listens on which address and port, and inspect established connections',
            'Interpret ping results including loss, latency and ICMP error messages',
            'Locate where along a path traffic stops with traceroute (UDP, ICMP and TCP modes) and tracepath',
            'Apply a bottom-up checklist to a "cannot connect" ticket'
          ],
          prereqs: ['L10-M1-T2', 'L10-M3-T1'],
          concept: `When a ticket says "server A cannot reach service B", work through evidence in a fixed order. Each step either finds the problem or rules a layer out.

1. **Is the service listening, on the right address?** On B: \`ss -tlnp\` (TCP) or \`ss -ulnp\` (UDP). \`-t\` TCP, \`-u\` UDP, \`-l\` listening, \`-n\` numeric (no slow name lookups), \`-p\` process (needs root to see other users' processes). A listener on \`127.0.0.1\` cannot be reached remotely.
2. **Does it work locally on B?** \`curl -v http://127.0.0.1:PORT/\` or the service's own client. If not, the problem is the application, not the network.
3. **Is there a route and a reachable next hop from A?** \`ip route get B\`, \`ip neigh\`, \`ping B\`.
4. **Where does the path stop?** \`tracepath -n B\` or \`traceroute -n B\`.
5. **Is a firewall or policy in the way?** Host firewall on B (firewalld), network firewalls, security groups — and on the client side too.
6. **Application layer**: HTTP status, TLS errors, DNS (next lesson).

**ss** is the modern replacement for netstat. Beyond listeners, \`ss -tnp state established '( dport = :5432 )'\` shows connections to a database, and \`ss -tn state syn-sent\` reveals outbound connection attempts that are not being answered — a strong hint of filtering.

**ping** sends ICMP Echo Requests. It proves IP reachability *and that ICMP is allowed*: many networks filter ICMP, so "no ping" does not prove a host is down. Read the summary (\`packet loss\`, \`rtt min/avg/max/mdev\`). Error replies matter: \`Destination Host Unreachable\` (often from your own host: no ARP answer for an on-link target, or from a router that cannot reach the final segment), \`Destination Net Unreachable\` (a router has no route), \`Packet filtered\`/\`Communication administratively prohibited\` (a firewall rejected it). TTL in replies hints at hop count and OS (64 Linux, 128 Windows, 255 network gear). \`ping -6\` or \`ping6\` for IPv6.

**traceroute** sends probes with increasing TTL; each router that decrements TTL to 0 returns ICMP Time Exceeded, revealing the hop. On RHEL the default probe is **UDP** to high ports; \`-I\` uses ICMP Echo and \`-T -p 443\` uses TCP SYN to a port (often the only mode that passes firewalls and shows where *your service traffic* stops). \`* * *\` means a hop did not reply — not necessarily that traffic stops there, since many routers rate-limit or ignore probes; what matters is whether *later* hops answer. **tracepath** is similar, needs no root and reports path MTU.

**mtr** (if installed) combines ping and traceroute continuously and is excellent for intermittent loss, but remember loss shown only at an intermediate hop (and not at the destination) is usually ICMP rate limiting.

> Reuse the same evidence order every time. Most "network problems" are found at step 1 or 2: wrong bind address or a dead service.`,
          internals: `\`ss\` queries the kernel via **NETLINK_SOCK_DIAG**, which is fast even with hundreds of thousands of sockets; netlink filters (\`'( dport = :443 )'\`) are applied inside the kernel. Process information comes from scanning \`/proc/PID/fd\` for socket inodes, which is why \`-p\` needs privileges and is slower.

\`ping\` on RHEL can run unprivileged using ICMP datagram sockets permitted by \`net.ipv4.ping_group_range\`, rather than raw sockets. \`traceroute\` relies on routers returning ICMP Time Exceeded (type 11) and the destination returning ICMP Port Unreachable (UDP mode), Echo Reply (ICMP mode) or SYN-ACK/RST (TCP mode) to know it arrived.`,
          useCases: [
            'Closing a P2 in minutes by showing the application is listening only on 127.0.0.1',
            'Proving to the network team, with traceroute -T, which hop stops TCP 443 while ICMP passes',
            'Using ss state syn-sent to show outbound database connections are being silently dropped',
            'Measuring latency and loss to a remote site during a WAN incident with ping and mtr'
          ],
          syntax: 'ss -tulnp\nss -tnp state established \'( dport = :PORT or sport = :PORT )\'\nss -tn state syn-sent\nping -c N [-I IFACE] HOST\ntracepath -n HOST\ntraceroute -n [-I | -T -p PORT] HOST',
          options: [
            ['ss -p', 'Show owning process (root to see all)'],
            ['ss state syn-sent', 'Connection attempts awaiting SYN-ACK'],
            ['ping -c N', 'Send N probes and stop'],
            ['ping -I IFACE/ADDR', 'Choose source interface or address'],
            ['ping -W SEC', 'Per-reply timeout'],
            ['traceroute -T -p PORT', 'TCP SYN probes to a port (root)'],
            ['traceroute -I', 'ICMP echo probes'],
            ['-n', 'No reverse DNS lookups (faster, avoids DNS dependency)']
          ],
          examples: [
            {
              title: 'Who listens where',
              cmd: 'sudo ss -tulnp',
              out: 'Netid State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port Process\nudp   UNCONN 0      0           127.0.0.1:323         0.0.0.0:*    users:(("chronyd",pid=812,fd=5))\ntcp   LISTEN 0      128           0.0.0.0:22          0.0.0.0:*    users:(("sshd",pid=1043,fd=3))\ntcp   LISTEN 0      511         127.0.0.1:8080        0.0.0.0:*    users:(("java",pid=2231,fd=41))\ntcp   LISTEN 0      4096                *:443               *:*    users:(("nginx",pid=1502,fd=6))',
              fields: [
                ['udp UNCONN', 'UDP sockets have no LISTEN state; UNCONN = bound and waiting'],
                ['127.0.0.1:8080 java', 'Application server reachable only locally — fine if nginx proxies to it'],
                ['*:443 nginx', 'Public listener on all IPv4 and IPv6 addresses'],
                ['users:(("sshd",pid=1043,fd=3))', 'Process name, PID and file descriptor']
              ]
            },
            {
              title: 'Unanswered outbound connections',
              cmd: 'ss -tn state syn-sent',
              out: 'Recv-Q Send-Q   Local Address:Port    Peer Address:Port\n0      1        10.20.30.41:51544      10.80.2.10:5432\n0      1        10.20.30.41:51546      10.80.2.10:5432',
              fields: [['SYN-SENT to 10.80.2.10:5432', 'SYNs sent to PostgreSQL, no SYN-ACK and no RST: something is silently dropping them']]
            },
            {
              title: 'TCP traceroute to the service port',
              cmd: 'sudo traceroute -n -T -p 5432 10.80.2.10',
              out: 'traceroute to 10.80.2.10 (10.80.2.10), 30 hops max, 60 byte packets\n 1  10.20.30.1  0.421 ms  0.398 ms  0.377 ms\n 2  172.16.0.9  1.102 ms  1.087 ms  1.066 ms\n 3  * * *\n 4  * * *\n 5  * * *',
              fields: [['hops 1-2 answer', 'Path is fine up to the core router'], ['* from hop 3 onwards (to the end)', 'TCP 5432 probes die after 172.16.0.9: likely a firewall between core and the DB segment']],
              note: 'Compare with `traceroute -n -I 10.80.2.10`: if ICMP reaches the host but TCP 5432 does not, it is a port-specific filter.'
            }
          ],
          walkthrough: [
            'On the server, run `sudo ss -tulnp` and list each service, its bind address and its process.',
            'Pick one service and test it locally with curl or its client.',
            'From a client, run `ip route get SERVER` and `ping -c 4 SERVER`; read loss and rtt.',
            'Run `tracepath -n SERVER` and `sudo traceroute -n -T -p PORT SERVER`; compare the paths.',
            'Simulate an unanswered connection with `timeout 5 bash -c "</dev/tcp/192.0.2.1/9999"` and run `ss -tn state syn-sent` in another terminal while it waits.'
          ],
          lab: {
            goal: 'Practise the first four steps of the diagnostic checklist with real evidence.',
            steps: [
              'Install tools: `sudo dnf install -y traceroute iputils iproute`.',
              'Start a listener: `python3 -m http.server 8080 --bind 127.0.0.1 &` and capture `sudo ss -tlnp \'sport = :8080\'`.',
              'Test locally with `curl -sI http://127.0.0.1:8080/ | head -1`, then from another VM against the server IP.',
              'Restart the listener bound to all addresses (`kill %1; python3 -m http.server 8080 &`) and retest remotely (open the port in firewalld in a lab only, see L11).',
              'Run `tracepath -n` and `traceroute -n -I` to an Internet host and note where replies stop.'
            ],
            verify: 'With the 127.0.0.1 bind, ss shows 127.0.0.1:8080 and remote curl fails; with the wildcard bind, ss shows 0.0.0.0:8080 and (with the port allowed) remote curl returns HTTP/1.0 200 OK.'
          },
          troubleshooting: {
            scenario: 'An application server cannot connect to its PostgreSQL database at 10.80.2.10:5432 after a network change window; other servers can.',
            steps: [
              'Evidence: on the app server `ss -tn state syn-sent` shows SYN-SENT to 10.80.2.10:5432; on the DB `ss -tlnp` shows postgres listening on 0.0.0.0:5432; `ping 10.80.2.10` works.',
              'Hypothesis: TCP 5432 from this app server\'s subnet is being silently dropped by a filter introduced in the change (ICMP is allowed, so routing is fine).',
              'Fix: `traceroute -T -p 5432` shows probes stopping after the core router; give the network team source, destination, port and the trace so they correct the firewall rule. Check the DB host firewall (`firewall-cmd --list-all`) as well.',
              'Validate: the SYN-SENT entries disappear, `ss -tnp state established \'( dport = :5432 )\'` shows connections, and the application health check passes.'
            ]
          },
          mistakes: [
            'Declaring a host down because it does not answer ping (ICMP may be filtered).',
            'Reading a single * * * hop in traceroute as the failure point when later hops answer.',
            'Running ss without -n and waiting for reverse DNS on every peer during an incident.',
            'Skipping the "does it work locally" step and escalating to the network team.',
            'Using only ICMP traceroute when the problem is a TCP port filter.'
          ],
          safety: [
            'All tools here are read-only; ss -p and TCP traceroute require root.',
            'Do not run high-rate pings (-f, small -i) against production devices; it can trigger rate limits or alarms.',
            'Record command outputs with timestamps in the incident ticket; they are your evidence.'
          ],
          distro: 'ss, ping and tracepath are installed by default on RHEL 8/9/10 (iproute and iputils); traceroute and mtr are separate packages. netstat lives in the deprecated net-tools package. Debian/Ubuntu use the same tools; Debian\'s inetutils-traceroute and traceroute packages differ in options.',
          challenge: {
            task: 'Write a five-command evidence sequence for "client 10.20.30.41 cannot reach https://10.80.5.5/". For each command state what result would rule a layer in or out.',
            solution: `\`\`\`
# On the server 10.80.5.5
sudo ss -tlnp 'sport = :443'            # listening on 0.0.0.0/*/10.80.5.5? if absent or 127.0.0.1 -> app/config problem
curl -kI https://127.0.0.1/              # works locally? if not -> application problem
# On the client 10.20.30.41
ip route get 10.80.5.5                   # sane route and source? wrong -> routing/addressing
sudo traceroute -n -T -p 443 10.80.5.5   # where do TCP 443 probes stop? -> locate the filter
curl -v --connect-timeout 5 https://10.80.5.5/   # refused / timed out / no route / TLS error tells you the layer
\`\`\`

The order is bottom-up from the server's perspective first because it is the cheapest to rule out. A refused connection points to the server (no listener or REJECT), a timeout to a silent drop on the path or host firewall, and a TLS or HTTP error means the network is fine and the problem is at the application layer.`
          },
          interview: [
            { q: 'Which command shows listening TCP/UDP sockets with numeric ports and owning processes?', a: 'ss -tulnp (TCP, UDP, listening, numeric, processes), run as root to see all processes. It replaces netstat -tulnp and queries the kernel over netlink.', mistake: 'Answering lsof -i or netstat without knowing ss.', followUp: 'How would you show only established connections to port 5432?' },
            { q: 'A host does not respond to ping. Is it down?', a: 'Not necessarily: ICMP echo may be filtered by a host or network firewall. Test the actual service port (curl, nc, TCP traceroute) and check ARP for on-link hosts.', mistake: 'Yes.', followUp: 'What does Destination Host Unreachable from your own IP mean?' },
            { q: 'Why would you use traceroute -T -p 443 instead of plain traceroute?', a: 'Plain traceroute on Linux uses UDP high ports, which firewalls often treat differently from your application traffic. TCP SYN probes to 443 follow the same policy as the real traffic and reveal where that port is filtered.', mistake: 'Not knowing the default probe protocol.', followUp: 'What do * * * hops in the middle of a trace mean when the destination still answers?' }
          ],
          revision: [
            'Checklist: listening? works locally? route/ARP? path? firewall? application.',
            'ss -tulnp for listeners; ss -tn state syn-sent for unanswered connects.',
            'No ping reply ≠ host down; test the real port.',
            'Linux traceroute default = UDP; -I = ICMP; -T -p PORT = TCP SYN.',
            '* * * in the middle is normal if later hops answer; tracepath needs no root and shows PMTU.'
          ]
        },
        {
          id: 'L10-M5-T2',
          title: 'Application and packet evidence: curl, openssl s_client, tcpdump and connection errors',
          minutes: 50,
          objectives: [
            'Distinguish connection refused, timed out and no route to host and map each to a likely cause',
            'Use curl -v to separate DNS, TCP, TLS and HTTP failures',
            'Inspect TLS certificates and handshakes with openssl s_client',
            'Capture and read packets with tcpdump to prove what is (or is not) on the wire'
          ],
          prereqs: ['L10-M5-T1'],
          concept: `Connection error messages are precise evidence if you know what produced them.

- **Connection refused** (\`ECONNREFUSED\`) — the client received a **TCP RST** in reply to its SYN (or an ICMP port-unreachable for UDP). The packet *reached* a host that actively said no: nothing listens on that port/address, or a firewall rule with a TCP-reset reject answered. It is fast — milliseconds.
- **Connection timed out** (\`ETIMEDOUT\`) — **no reply at all**. The SYN (or the reply) was silently dropped: a firewall DROP rule, a security group, wrong return route, host down behind a router, or the listener's backlog full. It is slow — the client retries SYNs for many seconds (about 2 minutes with default kernel settings unless the app sets a timeout).
- **No route to host** (\`EHOSTUNREACH\`) — either the local host has no route or could not resolve the next hop via ARP/NDP (on-link host down or wrong address), **or** an ICMP host-unreachable / admin-prohibited message came back. Important on RHEL: firewalld's default reject for traffic not allowed in a zone sends **icmp-host-prohibited**, which Linux clients report as *No route to host* — so this message from a host you *can* ping usually means **its firewall rejected the port**.
- **Network is unreachable** (\`ENETUNREACH\`) — no route at all locally for that destination (e.g. no default route, or no IPv6 route).

**curl** separates the layers: \`curl -v https://host/\` shows DNS resolution (\`Trying 10.70.4.15:443...\`), TCP connect (\`Connected to\`), TLS handshake and certificate checks, then the HTTP request and status. Useful flags: \`-I\` (HEAD), \`-k\` (skip certificate verification — diagnosis only), \`--connect-timeout\`, \`--resolve host:443:IP\` (bypass DNS to test a specific backend with the right SNI/Host), \`-w '%{http_code} %{time_connect} %{time_appconnect} %{time_total}\\n'\` for timings. \`wget\` is a simpler downloader with similar diagnostics (\`wget -S\` shows headers).

**openssl s_client** speaks TLS and prints the handshake: \`openssl s_client -connect host:443 -servername host </dev/null\`. Look at the **certificate chain**, **Verify return code** (\`0 (ok)\`, \`10 (certificate has expired)\`, \`19 (self-signed certificate in certificate chain)\`, \`21 (unable to verify the first certificate)\` — usually a missing intermediate on the server), and negotiated protocol and cipher. Pipe the certificate to \`openssl x509 -noout -subject -issuer -dates -ext subjectAltName\` to read names and expiry. Always pass \`-servername\`: servers hosting many sites pick the certificate by **SNI**.

**tcpdump** shows the truth on the wire. \`tcpdump -i ens192 -nn host 10.80.2.10 and port 5432\` prints packets; TCP flags are shown as \`[S]\` SYN, \`[S.]\` SYN-ACK, \`[.]\` ACK, \`[P.]\` push, \`[F.]\` FIN, \`[R]\`/\`[R.]\` reset. Repeating \`[S]\` with no answer = timeout; \`[S]\` answered by \`[R.]\` = refused. Write captures with \`-w file.pcap\` for Wireshark and limit them with \`-c\` or a filter.`,
          internals: `tcpdump uses libpcap and an in-kernel **BPF** filter attached to a packet socket, so only matching packets are copied to user space. It sees inbound packets *before* netfilter (firewalld) processes them and outbound packets *after* — so a SYN visible in tcpdump on the server but never answered can still be dropped by the host firewall.

For a refused TCP connection, the kernel itself generates the RST when no socket matches; firewalld (nftables) can generate RSTs or ICMP errors for rejected traffic. The client kernel translates incoming ICMP errors into errno values (host-prohibited -> EHOSTUNREACH, port-unreachable -> ECONNREFUSED) that tools like curl print as messages.`,
          useCases: [
            'Proving to a vendor that their service returns RST (no listener) rather than "our network dropping it"',
            'Finding a missing intermediate certificate after a renewal that breaks only some clients',
            'Testing a new backend behind a load balancer before DNS cutover with curl --resolve',
            'Capturing a short tcpdump to show that SYNs leave the client but never arrive at the server'
          ],
          syntax: 'curl -v [--connect-timeout N] [-k] [--resolve HOST:PORT:IP] URL\ncurl -s -o /dev/null -w \'%{http_code} %{time_total}\\n\' URL\nopenssl s_client -connect HOST:PORT -servername HOST [-showcerts] </dev/null\nopenssl x509 -noout -subject -issuer -dates\ntcpdump -i IFACE -nn [-c N] [-w FILE] FILTER',
          options: [
            ['curl -v', 'Verbose: DNS, connect, TLS and HTTP details'],
            ['curl --resolve h:p:ip', 'Force a name to an IP without touching DNS'],
            ['curl -k', 'Ignore certificate errors (diagnosis only, never in automation)'],
            ['openssl s_client -servername', 'Send SNI so the correct certificate is returned'],
            ['openssl s_client -showcerts', 'Print every certificate in the presented chain'],
            ['tcpdump -nn', 'No name or port name resolution'],
            ['tcpdump -w FILE / -r FILE', 'Write/read pcap files'],
            ['tcpdump -c N', 'Stop after N packets']
          ],
          examples: [
            {
              title: 'Three different failures from curl',
              cmd: 'curl -sS --connect-timeout 5 http://10.80.2.10:8080/; curl -sS --connect-timeout 5 http://10.80.2.11:8080/; curl -sS --connect-timeout 5 http://10.80.2.12:8080/',
              out: 'curl: (7) Failed to connect to 10.80.2.10 port 8080 after 2 ms: Connection refused\ncurl: (28) Connection timed out after 5001 milliseconds\ncurl: (7) Failed to connect to 10.80.2.12 port 8080 after 3 ms: No route to host',
              fields: [
                ['Connection refused after 2 ms', 'RST came back: host reached, nothing listening (or reset-reject)'],
                ['timed out after 5001 ms', 'No answer at all: silent drop on path or host, or host down behind a router'],
                ['No route to host after 3 ms', 'Fast ICMP reply: typically firewalld rejecting with host-prohibited (or no ARP answer for an on-link host)']
              ]
            },
            {
              title: 'Check the certificate chain and expiry',
              cmd: 'openssl s_client -connect www.example.com:443 -servername www.example.com </dev/null 2>/dev/null | grep -E "s:|i:|Verify return"',
              out: ' 0 s:CN = www.example.com\n   i:C = US, O = Example CA, CN = Example Issuing CA 2\nVerify return code: 21 (unable to verify the first certificate)',
              fields: [['Only depth 0 present', 'The server sends its leaf certificate without the intermediate'], ['Verify return code 21', 'Client cannot build the chain: install the full chain on the server']],
              note: 'Browsers sometimes cope by fetching missing intermediates; curl, Java and Python clients usually do not.'
            },
            {
              title: 'Refused versus dropped on the wire',
              cmd: 'sudo tcpdump -i ens192 -nn -c 6 host 10.80.2.10 and tcp port 8080',
              out: '10:41:02.114201 IP 10.20.30.41.51802 > 10.80.2.10.8080: Flags [S], seq 1866514523, win 64240, options [mss 1460,sackOK,TS val 1 ecr 0,nop,wscale 7], length 0\n10:41:02.115876 IP 10.80.2.10.8080 > 10.20.30.41.51802: Flags [R.], seq 0, ack 1866514524, win 0, length 0',
              fields: [['Flags [S]', 'Client SYN'], ['Flags [R.]', 'Server reset: port closed, so curl reports Connection refused']],
              note: 'A timeout looks like repeated [S] lines with growing gaps (1 s, 2 s, 4 s...) and nothing coming back.'
            }
          ],
          walkthrough: [
            'Reproduce each error in a lab: refused (closed port on a reachable host), timed out (an unused address behind your gateway, e.g. 192.0.2.1), no route to host (a port blocked by firewalld on a lab server).',
            'For each, run `curl -v --connect-timeout 5` and note the time to failure.',
            'Capture the same attempts with `sudo tcpdump -i ens192 -nn host TARGET` in another terminal and match flags to errors.',
            'Inspect a public TLS service: `openssl s_client -connect www.redhat.com:443 -servername www.redhat.com </dev/null | openssl x509 -noout -subject -issuer -dates`.',
            'Time a request: `curl -s -o /dev/null -w "%{time_connect} %{time_appconnect} %{time_total}\\n" https://www.redhat.com/`.'
          ],
          lab: {
            goal: 'Map each connection error to packet evidence and inspect a TLS certificate.',
            steps: [
              'On lab server B (RHEL 9/10), ensure nothing listens on 8081 and that firewalld is running with its default zone.',
              'From client A: `curl -v --connect-timeout 5 http://B:8081/` and capture on B with `sudo tcpdump -i any -nn port 8081 -c 4`.',
              'On B, temporarily allow 8081 in runtime only (`sudo firewall-cmd --add-port=8081/tcp`) and repeat: the error changes from No route to host to Connection refused.',
              'Start a listener on B (`python3 -m http.server 8081 &`) and repeat: HTTP 200.',
              'Remove the runtime rule (`sudo firewall-cmd --remove-port=8081/tcp`) and stop the listener.',
              'Check a certificate: `echo | openssl s_client -connect www.redhat.com:443 -servername www.redhat.com 2>/dev/null | openssl x509 -noout -enddate`.'
            ],
            verify: 'Recorded sequence: No route to host (firewalld reject, ICMP admin-prohibited in tcpdump) -> Connection refused ([R.] in tcpdump) -> 200 OK; openssl prints a notAfter= date in the future.'
          },
          troubleshooting: {
            scenario: 'After a certificate renewal, monitoring (curl-based) reports "SSL certificate problem: unable to get local issuer certificate" for portal.example.com, while browsers show the site fine.',
            steps: [
              'Evidence: `openssl s_client -connect portal.example.com:443 -servername portal.example.com -showcerts </dev/null` shows only the leaf certificate and `Verify return code: 21`.',
              'Hypothesis: the renewed certificate was installed without the intermediate CA chain; browsers fill the gap via AIA fetching, strict clients do not.',
              'Fix: install the full chain (leaf + intermediates, e.g. the CA\'s fullchain file) in the web server configuration, validate config syntax, then reload (not restart) the server.',
              'Validate: s_client shows depth 0 and 1 and `Verify return code: 0 (ok)`; the monitoring check passes without -k.'
            ]
          },
          mistakes: [
            'Treating refused, timed out and no route to host as the same "network issue" instead of three different layers of evidence.',
            'Leaving curl -k or verify=False in scripts after troubleshooting, disabling TLS security permanently.',
            'Running s_client without -servername and inspecting the wrong (default) certificate.',
            'Running tcpdump without a filter or count on a busy host and filling the disk or terminal.',
            'Opening the firewall as a reflex when the error is "Connection refused" (the host is reachable; nothing is listening).'
          ],
          safety: [
            'tcpdump requires root and can capture sensitive data (credentials in clear-text protocols, personal data); capture minimally, protect pcap files and delete them when done.',
            'Runtime firewall changes for testing must be removed afterwards; never test by stopping firewalld on production.',
            'curl -k and openssl verification bypasses are for diagnosis only.'
          ],
          distro: 'curl, wget, openssl and tcpdump behave the same on RHEL 8/9/10 and Debian/Ubuntu; tcpdump and wget may need installing. RHEL 9/10 system-wide crypto policies (update-crypto-policies) can make old TLS versions or SHA-1 certificates fail where RHEL 8 succeeded — check `update-crypto-policies --show` when handshakes fail only on newer hosts.',
          challenge: {
            task: 'A client gets "No route to host" connecting to 10.80.2.12:8080, yet `ping 10.80.2.12` works. Explain the most likely cause on a RHEL server, how to prove it, and the correct fix.',
            solution: `Ping working proves routing and ARP are fine. A fast "No route to host" for a specific port on a reachable RHEL host is the signature of **firewalld rejecting** the connection with ICMP host-prohibited/admin-prohibited.

Prove it:

\`\`\`
# on the client
sudo tcpdump -i ens192 -nn host 10.80.2.12          # shows [S] then "ICMP host 10.80.2.12 unreachable - admin prohibited filter"
# on the server
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --list-all                        # 8080/tcp not in services/ports
sudo ss -tlnp 'sport = :8080'                        # confirm something actually listens
\`\`\`

Fix by allowing the port in the correct zone, persistently, then reload:

\`\`\`
sudo firewall-cmd --permanent --zone=public --add-port=8080/tcp
sudo firewall-cmd --reload
\`\`\`

Do not stop firewalld. Re-test with curl; the result should now be the HTTP response (or "Connection refused" if nothing listens).`
          },
          interview: [
            { q: "What is the difference between 'Connection refused' and 'Connection timed out'?", a: 'Refused means the SYN reached a host that answered with a TCP RST: no listener on that port/address (or a reject-with-reset rule). Timed out means no reply at all: the packet or its reply was silently dropped by a firewall DROP rule, a security group, a routing problem or a down host.', mistake: 'Saying both mean the firewall blocks it.', followUp: "And what does 'No route to host' usually mean on RHEL when ping works?" },
            { q: 'How do you check when a remote TLS certificate expires?', a: 'openssl s_client -connect host:443 -servername host </dev/null 2>/dev/null | openssl x509 -noout -enddate (or -dates). In monitoring, -checkend SECONDS returns non-zero if it expires within that window.', mistake: 'Only checking in a browser.', followUp: 'What does Verify return code 21 indicate?' },
            { q: 'How would you prove packets reach a server?', a: 'Run tcpdump on the server interface filtered on the client and port (tcpdump -i IFACE -nn host CLIENT and port PORT). Seeing SYNs arrive with no reply points to the host firewall or service; seeing nothing points upstream.', mistake: 'Relying on application logs only.', followUp: 'Does tcpdump see packets before or after firewalld drops them?' }
          ],
          revision: [
            'Refused = RST (reached host, no listener). Timed out = silence (drop). No route to host = local ARP/route failure or ICMP prohibited (firewalld reject).',
            'curl -v shows DNS -> TCP -> TLS -> HTTP; --resolve bypasses DNS.',
            'openssl s_client -connect h:443 -servername h; Verify return code 0 is good, 21 = missing intermediate, 10 = expired.',
            'tcpdump flags: [S] SYN, [S.] SYN-ACK, [R.] reset; -nn, -c, -w.',
            'Never fix by disabling firewalld or certificate verification.'
          ]
        }
      ]
    }
  ]
};
