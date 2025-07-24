
import CodeMirrorEditor from '../code-mirror-editor'
import './index.css'
export function Main() {
    const [value, setValue] = useState('')
    return <div className='main-container'>
        <div className='left-container'>

        </div>
        <div className='right-container'>
            <CodeMirrorEditor value={value} onChange={setValue} />
        </div>
    </div>
}