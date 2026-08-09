import { Redirect } from 'expo-router';

/** Legacy template route — redirect to home. */
export default function TwoScreen() {
  return <Redirect href="/" />;
}
