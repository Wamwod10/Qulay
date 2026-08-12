import AppRouter from "../routes/AppRouter";

import GlobalLoader from "../components/GlobalLoader/GlobalLoader";

import useAppLoading from "../hooks/useAppLoading";

const App = () => {
  const isLoading = useAppLoading();

  if (isLoading) {
    return <GlobalLoader />;
  }

  return <AppRouter />;
};

export default App;
