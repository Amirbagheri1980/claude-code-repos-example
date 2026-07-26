import { motion } from 'framer-motion'

interface CardProps {
  value: string
  selected: boolean
  onClick: () => void
}

function Card({ value, selected, onClick }: CardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.95 }}
      animate={{ scale: selected ? 1.08 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`flex h-24 w-16 shrink-0 items-center justify-center rounded-xl border-2 text-2xl font-semibold shadow-lg transition-colors sm:h-28 sm:w-20 ${
        selected
          ? 'border-accent-yellow bg-purple-secondary text-white'
          : 'border-blue-primary/40 bg-white text-dark-navy hover:border-blue-primary'
      }`}
    >
      {value}
    </motion.button>
  )
}

export default Card
