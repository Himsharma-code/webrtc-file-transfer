import type { FileTransferCallbacks, FileOffer } from "../types"

interface FileChunk {
  transferId: string
  chunkIndex: number
  totalChunks: number
  data: number[]
  fileName: string
  fileSize: number
}

interface PeerDataChannel {
  dataChannel: {
    readyState: string
    send: (data: string) => void
  }
}

export class FileTransferService {
  private callbacks: FileTransferCallbacks
  private receivedChunks: Map<string, Map<number, Uint8Array>> = new Map()
  private readonly chunkSize = 16384 // 16KB chunks

  constructor(callbacks: FileTransferCallbacks) {
    this.callbacks = callbacks
  }

  async sendFile(file: File, peer: PeerDataChannel, transferId: string): Promise<void> {
    console.log("🚀 Starting file transfer:", transferId, file.name)

    if (!peer.dataChannel || peer.dataChannel.readyState !== "open") {
      throw new Error("Data channel not ready")
    }

    const totalChunks = Math.ceil(file.size / this.chunkSize)
    const startTime = Date.now()

    try {
      const arrayBuffer = await file.arrayBuffer()
      const fileData = new Uint8Array(arrayBuffer)

      console.log(`📦 Sending ${totalChunks} chunks for ${file.name}`)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.chunkSize
        const end = Math.min(start + this.chunkSize, file.size)
        const chunk = fileData.slice(start, end)

        const chunkMessage = {
          type: "file-chunk",
          transferId,
          chunkIndex: i,
          totalChunks,
          data: Array.from(chunk),
          fileName: file.name,
          fileSize: file.size,
        }

        peer.dataChannel.send(JSON.stringify(chunkMessage))
        console.log(`📤 Sent chunk ${i + 1}/${totalChunks}`)

        this.updateProgress(transferId, i + 1, totalChunks, startTime)
        await this.delay(10) // Slightly longer delay to prevent overwhelming
      }

      console.log(`✅ File transfer completed: ${transferId}`)
      this.callbacks.onTransferComplete(transferId)
    } catch (error) {
      console.error(`❌ File transfer error:`, error)
      this.callbacks.onTransferError(transferId, error as string)
    }
  }

  handleFileOffer(data: any, fromPeerId: string): void {
    const offer: FileOffer = {
      transferId: data.transferId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fromPeerId,
    }
    this.callbacks.onFileOffer(offer)
  }

  handleFileChunk(data: any): void {
    const { transferId, chunkIndex, totalChunks, data: chunkData, fileName } = data

    if (!Array.isArray(chunkData)) {
      this.callbacks.onTransferError(transferId, "Invalid chunk data")
      return
    }

    try {
      this.storeChunk(transferId, chunkIndex, new Uint8Array(chunkData))
      this.updateReceiveProgress(transferId, totalChunks)

      if (this.isTransferComplete(transferId, totalChunks)) {
        this.assembleAndDownloadFile(transferId, fileName, totalChunks)
      }
    } catch (error) {
      this.callbacks.onTransferError(transferId, error as string)
    }
  }

  private storeChunk(transferId: string, chunkIndex: number, chunkData: Uint8Array): void {
    if (!this.receivedChunks.has(transferId)) {
      this.receivedChunks.set(transferId, new Map())
    }
    this.receivedChunks.get(transferId)!.set(chunkIndex, chunkData)
  }

  private updateProgress(transferId: string, sentChunks: number, totalChunks: number, startTime: number): void {
    const progress = (sentChunks / totalChunks) * 100
    const elapsed = Date.now() - startTime
    const speed = elapsed > 0 ? (sentChunks * this.chunkSize) / (elapsed / 1000) : 0
    this.callbacks.onTransferProgress(transferId, progress, speed)
  }

  private updateReceiveProgress(transferId: string, totalChunks: number): void {
    const chunks = this.receivedChunks.get(transferId)
    if (chunks) {
      const progress = (chunks.size / totalChunks) * 100
      this.callbacks.onTransferProgress(transferId, progress, 0)
    }
  }

  private isTransferComplete(transferId: string, totalChunks: number): boolean {
    const chunks = this.receivedChunks.get(transferId)
    return chunks ? chunks.size === totalChunks : false
  }

  private assembleAndDownloadFile(transferId: string, fileName: string, totalChunks: number): void {
    const chunks = this.receivedChunks.get(transferId)
    if (!chunks) {
      throw new Error("No chunks found for transfer")
    }

    // Verify all chunks are present
    for (let i = 0; i < totalChunks; i++) {
      if (!chunks.has(i)) {
        throw new Error(`Missing chunk ${i}`)
      }
    }

    // Assemble chunks in order
    const orderedChunks: Uint8Array[] = []
    for (let i = 0; i < totalChunks; i++) {
      orderedChunks.push(chunks.get(i)!)
    }

    // Create and download file
    const blob = new Blob(orderedChunks)
    this.downloadBlob(blob, fileName)

    // Cleanup
    this.receivedChunks.delete(transferId)
    this.callbacks.onTransferComplete(transferId)
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export type { FileOffer }
