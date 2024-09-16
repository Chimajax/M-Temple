import React from 'react';
import Plan from './Plan';
import useRemainingTime from '../hooks/useRemainingTime';

const ParentComponent = () => {
  const [remainingTime, setRemainingTime] = useRemainingTime(0);

  return (
    <Plan remainingTime={remainingTime} setRemainingTime={setRemainingTime} />
  );
};

export default ParentComponent;
