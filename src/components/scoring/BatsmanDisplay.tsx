'use client'
import { BattingInnings } from '@/types/cricket'

interface BatsmanDisplayProps {
  striker: BattingInnings | null
  nonStriker: BattingInnings | null
}

function sr(runs: number, balls: number) {
  return balls > 0 ? ((runs / balls) * 100).toFixed(0) : '0'
}

function BatsmanRow({
  bi,
  isStriker,
}: {
  bi: BattingInnings
  isStriker: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2 px-1 rounded-lg ${isStriker ? 'bg-green-900/20' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isStriker ? 'bg-green-400' : 'bg-gray-600'}`} />
        <div className="min-w-0">
          <span className={`font-medium text-sm truncate block ${isStriker ? 'text-green-50' : 'text-gray-400'}`}>
            {bi.player?.name ?? 'Unknown'}
            {isStriker && <span className="text-green-400 ml-1">*</span>}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
        <span className={`font-bold text-base score-display ${isStriker ? 'text-green-400' : 'text-gray-300'}`}>
          {bi.runs}
        </span>
        <span className="text-gray-500">({bi.balls})</span>
        <span className="text-gray-600">{bi.fours}×4</span>
        <span className="text-gray-600">{bi.sixes}×6</span>
        <span className="text-gray-500">SR:{sr(bi.runs, bi.balls)}</span>
      </div>
    </div>
  )
}

export function BatsmanDisplay({ striker, nonStriker }: BatsmanDisplayProps) {
  if (!striker && !nonStriker) {
    return (
      <div className="cricket-card p-3 text-center text-gray-600 text-sm">
        Select batsmen to begin
      </div>
    )
  }

  return (
    <div className="cricket-card p-3 flex flex-col gap-1">
      <div className="text-xs text-gray-500 mb-1">Batting</div>
      {striker && <BatsmanRow bi={striker} isStriker={true} />}
      {nonStriker && <BatsmanRow bi={nonStriker} isStriker={false} />}
    </div>
  )
}
