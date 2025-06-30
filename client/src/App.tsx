import React from 'react'
import { Player, VOTE_OPTIONS } from '@planning-poker/shared'

function App() {
  return (
    <div>
      <h1>Planning Poker</h1>
      <p>Welcome to Planning Poker!</p>
      <div>
        <h3>Vote Options:</h3>
        {VOTE_OPTIONS.map(option => (
          <button key={option}>{option}</button>
        ))}
      </div>
    </div>
  )
}

export default App