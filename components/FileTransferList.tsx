import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import type { FileTransfer } from "../types"
import { formatFileSize, formatSpeed } from "../utils/format"

interface FileTransferListProps {
  fileTransfers: FileTransfer[]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />
    case "transferring":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />
  }
}

export const FileTransferList: React.FC<FileTransferListProps> = ({ fileTransfers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          File Transfers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fileTransfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Download className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No file transfers yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {fileTransfers.map((transfer) => (
              <div key={transfer.id} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(transfer.status)}
                      <span className="font-medium">{transfer.fileName}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatFileSize(transfer.fileSize)} • {transfer.direction}
                      {transfer.speed > 0 && ` • ${formatSpeed(transfer.speed)}`}
                    </div>
                  </div>
                  <Badge
                    variant={
                      transfer.status === "completed"
                        ? "default"
                        : transfer.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {transfer.status}
                  </Badge>
                </div>
                <Progress value={transfer.progress} className="w-full" />
                <div className="text-sm text-gray-600">{transfer.progress.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
