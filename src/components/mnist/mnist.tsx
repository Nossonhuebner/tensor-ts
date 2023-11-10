import mnist, { Datum } from 'mnist';
import { useMemo, useState, useEffect } from 'react';
import { MLP, softmax } from '../../util/nn';
import { Button, Stack, TextField } from '@mui/material';
import Chart from './chart'
import { Value } from '../../util/engine';
import DigitPreview from './digitPreview';

type ImageItem = Datum & { loss?: number, preds?: number[] }
type ImageDataSet = {
    training: ImageItem[],
    test: ImageItem[],
}

function Mnist() {
    const net = useMemo(() => new MLP(28 * 28, [10]), []);

    const [accuracy, setAccuracy] = useState<number[]>([]);
    const [loss, setLoss] = useState<number[]>([])
    const [stepCount, setStepCount] = useState(Infinity);
    const [dataset, setDataset] = useState<ImageDataSet>({ training: [], test: [] })
    const [epocs, setEpocs] = useState(10)
    const [batchSize, setBatchSize] = useState(60)
    const [lr, setLr] = useState(0.001)

    useEffect(() => {
        if (stepCount < epocs) {
            console.log(`epoc: ${stepCount}`)
            const set = getData(batchSize)
            setDataset(() => set)
            console.log(set)
            runEpoc(net, set.training, set.test, lr)
            setStepCount(cur => cur + 1)
        }
    }, [stepCount, dataset])

    function runEpoc(net: MLP, training: ImageItem[], validation: ImageItem[], lr: number) {
        const l = train(net, training, lr);
        const a = valid(net, validation);
        setLoss([...loss, l])
        setAccuracy([...accuracy, a])
    }

    return (
        <div>
            <h1>Mnist</h1>
            {/* {dataset?.training.map(trainItem => (
                <DigitPreview digit={trainItem.input} label={trainItem.output.indexOf(1)} loss={trainItem.loss}/>
            ))} */}


            <TextField label="#Epocs" variant="outlined" type="number" value={epocs} onChange={(e) => setEpocs(parseInt(e.currentTarget.value))} />
            <TextField label="Batch size" variant="outlined" type="number" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.currentTarget.value))} />
            <TextField label="Learning rate" variant="outlined" type="number" value={lr} onChange={(e) => setLr(parseFloat(e.currentTarget.value))} />
            <Button onClick={() => setStepCount(0)}>Train</Button>
            <Chart data={loss} label="Loss" color="red" />
            <Stack direction="row" className="resultsContainer">
                <Chart data={accuracy} label="Accuracy" color="def not red lol" />
                <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center'}}>
                    {dataset?.test.map((testItem, idx) => (
                        <DigitPreview key={idx} digit={testItem.input} label={testItem.output.indexOf(1)} preds={testItem.preds} />
                    ))}
                </div>
            </Stack>
        </div>
    )
}


function valid(net: MLP, validation: ImageItem[]) {
    const count = validation.length;
    let correct = 0;
    validation.forEach(item => {
        const { input, output } = item;

        const logits = net.forward(input);
        const probs = softmax(logits);

        const yIdx = output.indexOf(1);
        const probVals = probs.map(v => v.data);
        const maxProb = Math.max(...probVals)
        const predIdx = probVals.indexOf(maxProb);
        item.preds = probVals;
        correct += Number(yIdx == predIdx);
    })
    const accuracy = correct / count
    console.log('accuracy:', accuracy);
    return accuracy;

}

function train(net: MLP, training: ImageItem[], lr: number) {
    const count = training.length

    let aggLoss = new Value(0)
    training.forEach(item => {
        const { input, output } = item;

        // forward
        const logits = net.forward(input);
        const probs = softmax(logits);

        const loss = probs[output.indexOf(1)].negativeLogLikelihood()
        item.loss = loss.data;
        aggLoss = aggLoss.plus(loss);

    })

    //backward
    net.parameters.forEach(p => p.grad = 0);
    aggLoss = aggLoss.divide(count);
    aggLoss.backward()
    net.parameters.forEach(p => p.data += -lr * p.grad)

    // const avg =  aggLoss / count;
    console.log('avgLoss:', aggLoss.data);
    return aggLoss.data;
}


function getData(batchSize: number): ImageDataSet {
    return mnist.set(batchSize, batchSize*0.25)
}

export default Mnist;