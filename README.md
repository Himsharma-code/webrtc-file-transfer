# WebRTC File Transfer Application

## Overview

This application enables direct browser-to-browser file transfers using WebRTC (Web Real-Time Communication) without relying on a central server for data transfer. It leverages peer-to-peer (P2P) connections to send files securely and efficiently, reducing dependency on cloud storage or third-party services.

## Features

### 🌐 Connection Management

- **Hybrid Signaling** (Local BroadcastChannel + Remote WebSocket)
- **Auto-discovery** of peers in same browser
- **Manual connection** via Peer ID
- Visual connection status indicators

### 📁 File Transfers

- Send/receive files of any type
- Progress tracking with speed calculation
- Accept/reject incoming transfers
- Transfer history with status:
  - ✅ Completed
  - ⏳ Pending
  - ❌ Failed
  - 🔄 Transferring

### 💬 Testing Tools

- Test message functionality
- Real-time activity log
- Connection debugging info

## Technical Stack

| Component  | Technology                            |
| ---------- | ------------------------------------- |
| Frontend   | React + TypeScript                    |
| UI Library | Shadcn/ui (Tailwind)                  |
| WebRTC     | Native browser APIs                   |
| Signaling  | Hybrid (BroadcastChannel + WebSocket) |

## Usage

### Connecting Peers

```diff
# Same Browser/Machine
1. Open multiple tabs
2. Peers auto-appear in discovery list
3. Click "Connect"

# Different Machines
1. Share Peer ID manually
2. Enter peer's ID in connection box
3. Requires signaling server
```
