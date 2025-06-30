import { BrowserRouter } from 'react-router-dom';
import App from './App';

function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

export default AppWithRouter;